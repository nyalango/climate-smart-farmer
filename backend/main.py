"""Climate Smart Farmer API.

Run from the backend folder:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
(--host 0.0.0.0 is what lets a phone on the same Wi-Fi reach it.)
"""

import asyncio
import hashlib
import hmac
import logging
import os
import secrets
import smtplib
import ssl
import time
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from pathlib import Path
from typing import Optional

import bcrypt
import httpx
import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import Boolean, DateTime, Float, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")  # always backend/.env, whatever folder uvicorn was started from
log = logging.getLogger("uvicorn.error")


# ── Configuration ────────────────────────────────────────────────────────────
def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        return f"sqlite:///{BASE_DIR / 'farmers.db'}"
    if url.startswith("sqlite:///./"):  # relative path -> anchor to this folder, not the shell's cwd
        return f"sqlite:///{BASE_DIR / url[len('sqlite:///./'):]}"
    # Render and other managed PostgreSQL providers may supply either URL scheme.
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


DATABASE_URL = _database_url()
JWT_SECRET = os.getenv("JWT_SECRET", "development-only-change-me")
JWT_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080") or 10080)
CODE_MINUTES = 10
RESEND_COOLDOWN_SECONDS = 30
MAX_CODE_ATTEMPTS = 5
DEV_PRINT_CODE = os.getenv("DEV_PRINT_CODE", "false").strip().lower() == "true"

if JWT_SECRET == "development-only-change-me":
    if os.getenv("ENVIRONMENT", "").strip().lower() == "production":
        raise RuntimeError("Set a strong JWT_SECRET environment variable before production deployment.")
    log.warning("JWT_SECRET is not set. Put a long random value in backend/.env before going live.")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

app = FastAPI(title="Climate Smart Farmer API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """SQLite returns naive datetimes; everything we store is UTC."""
    return dt.replace(tzinfo=timezone.utc) if dt is not None and dt.tzinfo is None else dt


# ── Database ─────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


class Farmer(Base):
    __tablename__ = "farmers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    location_key: Mapped[str] = mapped_column(String(80), default="kampala")
    location_name: Mapped[str] = mapped_column(String(120), default="Kampala")
    latitude: Mapped[float] = mapped_column(Float, default=0)
    longitude: Mapped[float] = mapped_column(Float, default=0)
    language_code: Mapped[str] = mapped_column(String(12), default="en")
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    code_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    code_expires: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


Base.metadata.create_all(engine)


def db():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


# ── Locations ────────────────────────────────────────────────────────────────
# Town-centre approximations used to pick a forecast grid cell, not farm-level survey data.
LOCATIONS = [
    ("kampala", "Kampala", "Uganda", 0.3476, 32.5825, "lg"), ("entebbe", "Entebbe", "Uganda", 0.0560, 32.4795, "lg"),
    ("jinja", "Jinja", "Uganda", 0.4479, 33.2026, "lg"), ("mbale", "Mbale", "Uganda", 1.0644, 34.1797, "nyn"),
    ("gulu", "Gulu", "Uganda", 2.7746, 32.2990, "ach"), ("lira", "Lira", "Uganda", 2.2499, 32.8998, "ach"),
    ("mbarara", "Mbarara", "Uganda", -0.6072, 30.6545, "nyn"), ("fort-portal", "Fort Portal", "Uganda", 0.6710, 30.2750, "nyn"),
    ("arua", "Arua", "Uganda", 3.0201, 30.9111, "en"), ("hoima", "Hoima", "Uganda", 1.4331, 31.3524, "en"),
    ("nairobi", "Nairobi", "Kenya", -1.2921, 36.8219, "sw"), ("mombasa", "Mombasa", "Kenya", -4.0435, 39.6682, "sw"),
    ("kisumu", "Kisumu", "Kenya", -0.0917, 34.7680, "sw"), ("nakuru", "Nakuru", "Kenya", -0.3031, 36.0800, "sw"),
    ("eldoret", "Eldoret", "Kenya", 0.5143, 35.2698, "sw"), ("thika", "Thika", "Kenya", -1.0396, 37.0900, "sw"),
    ("dar-es-salaam", "Dar es Salaam", "Tanzania", -6.7924, 39.2083, "sw"), ("arusha", "Arusha", "Tanzania", -3.3869, 36.6830, "sw"),
    ("dodoma", "Dodoma", "Tanzania", -6.1630, 35.7516, "sw"), ("mwanza", "Mwanza", "Tanzania", -2.5164, 32.9175, "sw"),
    ("mbeya", "Mbeya", "Tanzania", -8.9094, 33.4608, "sw"), ("kigali", "Kigali", "Rwanda", -1.9441, 30.0619, "rw"),
    ("huye", "Huye", "Rwanda", -2.5967, 29.7394, "rw"), ("bujumbura", "Bujumbura", "Burundi", -3.3614, 29.3599, "rn"),
    ("gitega", "Gitega", "Burundi", -3.4271, 29.9246, "rn"), ("addis-ababa", "Addis Ababa", "Ethiopia", 9.0320, 38.7469, "am"),
    ("hawassa", "Hawassa", "Ethiopia", 7.0621, 38.4764, "am"), ("mogadishu", "Mogadishu", "Somalia", 2.0469, 45.3182, "so"),
    ("juba", "Juba", "South Sudan", 4.8594, 31.5713, "en"), ("malakal", "Malakal", "South Sudan", 9.5334, 31.6605, "en"),
]
LANGUAGE_CODES = {"en", "sw", "lg", "ach", "nyn", "rw", "rn", "am", "so", "om", "ar"}


def location_dict(row):
    key, name, country, lat, lon, lang = row
    return {"key": key, "name": name, "country": country, "latitude": lat, "longitude": lon, "default_lang": lang}


def get_loc(key: str):
    for row in LOCATIONS:
        if row[0] == key:
            return location_dict(row)
    raise HTTPException(400, "Choose a supported town from /locations.")


# ── Passwords & tokens ───────────────────────────────────────────────────────
# bcrypt is used directly (passlib 1.7 crashes with bcrypt >= 4.1). bcrypt only reads the first 72 bytes.
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("ascii")


def check_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], hashed.encode("ascii"))
    except (ValueError, TypeError):
        return False


DUMMY_HASH = hash_password("not-a-real-password")  # keeps login timing similar for unknown emails


def token_for(f: Farmer) -> str:
    return jwt.encode({"sub": str(f.id), "exp": utcnow() + timedelta(minutes=JWT_MINUTES)}, JWT_SECRET, algorithm="HS256")


def farmer_json(f: Farmer) -> dict:
    return {
        "id": f.id, "name": f.name, "email": f.email,
        "location_key": f.location_key, "location_name": f.location_name,
        "latitude": f.latitude, "longitude": f.longitude,
        "language_code": f.language_code, "verified": f.verified,
    }


def normalize_email(email) -> str:
    return str(email).strip().lower()


def code_digest(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def new_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


# ── Email (SMTP) ─────────────────────────────────────────────────────────────
class SmtpSettings:
    def __init__(self):
        self.host = os.getenv("SMTP_HOST", "").strip()
        self.port = int(os.getenv("SMTP_PORT", "587") or 587)
        self.user = os.getenv("SMTP_USER", "").strip()
        password = os.getenv("SMTP_PASSWORD", "")
        if self.host.lower().endswith(("gmail.com", "googlemail.com")):
            # Google shows app passwords as "abcd efgh ijkl mnop" (sometimes with non-breaking spaces).
            password = "".join(password.split())
        self.password = password.strip()
        self.sender = os.getenv("SMTP_FROM", "").strip() or self.user
        self.starttls = os.getenv("SMTP_STARTTLS", "true").strip().lower() == "true"

    @property
    def configured(self) -> bool:
        return bool(self.host and self.user and self.password and self.sender)


def build_message(to_email: str, code: str, sender: str, name: str = "") -> EmailMessage:
    greeting = f"Hello {name}," if name else "Hello,"
    msg = EmailMessage()
    msg["Subject"] = f"{code} is your Climate Smart Farmer verification code"
    msg["From"] = sender
    msg["To"] = to_email
    msg["Date"] = formatdate(localtime=False)
    msg["Message-ID"] = make_msgid(domain="climate-smart-farmer.local")
    msg.set_content(
        f"{greeting}\n\nYour verification code is: {code}\n\n"
        f"It expires in {CODE_MINUTES} minutes. If you did not request this, you can ignore this email.\n"
    )
    msg.add_alternative(
        f"""<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px">
  <h2 style="color:#0F9D58;margin:0 0 12px">Climate Smart Farmer Advisory</h2>
  <p>{greeting}</p>
  <p>Your verification code is:</p>
  <p style="font-size:34px;font-weight:700;letter-spacing:8px;background:#E6F7EF;padding:14px;text-align:center;border-radius:10px;margin:12px 0">{code}</p>
  <p style="color:#5C6B63;font-size:13px">It expires in {CODE_MINUTES} minutes. If you did not request this, ignore this email.</p>
</div>""",
        subtype="html",
    )
    return msg


def deliver(cfg: SmtpSettings, msg: EmailMessage) -> None:
    """Raw SMTP send. Raises smtplib/OSError exceptions untouched (test_email.py prints them)."""
    context = ssl.create_default_context()
    if cfg.port == 465:  # implicit TLS
        with smtplib.SMTP_SSL(cfg.host, cfg.port, timeout=20, context=context) as smtp:
            smtp.login(cfg.user, cfg.password)
            smtp.send_message(msg)
        return
    with smtplib.SMTP(cfg.host, cfg.port, timeout=20) as smtp:
        smtp.ehlo()
        if cfg.starttls:
            smtp.starttls(context=context)
            smtp.ehlo()
        smtp.login(cfg.user, cfg.password)
        smtp.send_message(msg)


def send_code(email: str, code: str, name: str = "") -> str:
    """Email the code. Returns 'email' or 'console' (dev mode). Raises HTTPException with a clear message."""
    cfg = SmtpSettings()
    if not cfg.configured:
        if DEV_PRINT_CODE:
            log.warning("[DEV] SMTP not configured. Verification code for %s is %s", email, code)
            return "console"
        raise HTTPException(
            503,
            "Email sending is not set up on the server. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM in backend/.env.",
        )
    try:
        deliver(cfg, build_message(email, code, cfg.sender, name))
        log.info("Verification email sent to %s", email)
        return "email"
    except smtplib.SMTPAuthenticationError as e:
        log.error("SMTP login rejected for %s: %s", cfg.user, e)
        message = "The server could not log in to its email account. The admin must set SMTP_PASSWORD to a valid Gmail App Password."
    except smtplib.SMTPRecipientsRefused:
        raise HTTPException(400, "That email address was rejected by the mail server. Check it for typos.")
    except smtplib.SMTPSenderRefused as e:
        log.error("SMTP sender refused: %s", e)
        message = "The mail server refused the sender address. SMTP_FROM must match the SMTP_USER account."
    except (smtplib.SMTPException, OSError, ssl.SSLError, UnicodeError) as e:
        log.error("SMTP send failed: %r", e)
        message = "Could not send the verification email right now. Please try again in a minute."
    if DEV_PRINT_CODE:
        log.warning("[DEV] Email failed. Verification code for %s is %s", email, code)
        return "console"
    raise HTTPException(503, message)


# ── Simple in-memory abuse limits (reset on server restart) ──────────────────
_last_code_sent: dict[str, float] = {}
_code_attempts: dict[str, int] = {}
_login_failures: dict[str, list[float]] = {}


def check_resend_cooldown(email: str) -> None:
    wait = RESEND_COOLDOWN_SECONDS - (time.time() - _last_code_sent.get(email, 0))
    if wait > 0:
        raise HTTPException(429, f"Please wait {int(wait) + 1} seconds before requesting another code.")


def issue_and_send(f: Farmer, s: Session) -> str:
    """Store a fresh hashed code, then email it. Returns 'email' or 'console'."""
    code = new_code()
    f.code_hash = code_digest(code)
    f.code_expires = utcnow() + timedelta(minutes=CODE_MINUTES)
    s.commit()
    _code_attempts[f.email] = 0
    delivery = send_code(f.email, code, f.name)
    _last_code_sent[f.email] = time.time()
    return delivery


# ── Auth routes ──────────────────────────────────────────────────────────────
class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    location_key: str = "kampala"
    language_code: str = "en"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @field_validator("password")
    @classmethod
    def password_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password is too long (72 bytes maximum).")
        return v


class VerifyIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ResendIn(BaseModel):
    email: EmailStr


@app.get("/health")
def health():
    cfg = SmtpSettings()
    return {"status": "ok", "email_configured": cfg.configured, "dev_print_code": DEV_PRINT_CODE}


@app.get("/locations")
def locations():
    return [location_dict(x) for x in LOCATIONS]


@app.get("/locations/reverse")
def reverse_location(lat: float, lon: float):
    nearest = min(LOCATIONS, key=lambda x: (x[3] - lat) ** 2 + (x[4] - lon) ** 2)
    return location_dict(nearest)


@app.post("/auth/register", status_code=201)
def register(body: RegisterIn, s: Session = Depends(db)):
    email = normalize_email(body.email)
    loc = get_loc(body.location_key)
    lang = body.language_code if body.language_code in LANGUAGE_CODES else "en"
    lat = body.latitude if body.latitude is not None else loc["latitude"]
    lon = body.longitude if body.longitude is not None else loc["longitude"]

    f = s.scalar(select(Farmer).where(Farmer.email == email))
    if f and f.verified:
        raise HTTPException(409, "An account with this email already exists. Please sign in.")
    if f:  # signed up before but never verified: let them try again instead of getting stuck
        check_resend_cooldown(email)
    else:
        f = Farmer(email=email)
        s.add(f)

    f.name = body.name.strip()
    f.password_hash = hash_password(body.password)
    f.location_key, f.location_name = loc["key"], loc["name"]
    f.latitude, f.longitude, f.language_code = lat, lon, lang
    f.verified = False
    s.commit()
    s.refresh(f)

    delivery = issue_and_send(f, s)
    return {"message": "Verification code sent.", "email": email, "delivery": delivery}


@app.post("/auth/verify")
def verify(body: VerifyIn, s: Session = Depends(db)):
    email = normalize_email(body.email)
    f = s.scalar(select(Farmer).where(Farmer.email == email))
    if not f or not f.code_hash:
        raise HTTPException(400, "No pending verification for this email.")
    expiry = as_utc(f.code_expires)
    if not expiry or expiry < utcnow():
        raise HTTPException(400, "This code has expired. Tap 'Resend code' to get a new one.")
    if _code_attempts.get(email, 0) >= MAX_CODE_ATTEMPTS:
        raise HTTPException(429, "Too many incorrect attempts. Tap 'Resend code' to get a new one.")
    if not hmac.compare_digest(f.code_hash, code_digest(body.code.strip())):
        _code_attempts[email] = _code_attempts.get(email, 0) + 1
        raise HTTPException(400, "Incorrect verification code.")
    f.verified, f.code_hash, f.code_expires = True, None, None
    s.commit()
    _code_attempts.pop(email, None)
    return {"access_token": token_for(f), "token_type": "bearer", "farmer": farmer_json(f)}


@app.post("/auth/resend")
def resend(body: ResendIn, s: Session = Depends(db)):
    email = normalize_email(body.email)
    f = s.scalar(select(Farmer).where(Farmer.email == email))
    if not f:
        raise HTTPException(404, "No account found for this email. Create an account first.")
    if f.verified:
        raise HTTPException(400, "This email is already verified. Please sign in.")
    check_resend_cooldown(email)
    delivery = issue_and_send(f, s)
    return {"message": "A new verification code was sent.", "delivery": delivery}


@app.post("/auth/login")
def login(body: LoginIn, s: Session = Depends(db)):
    email = normalize_email(body.email)
    now = time.time()
    recent = [t for t in _login_failures.get(email, []) if now - t < 900]
    if len(recent) >= 8:
        raise HTTPException(429, "Too many failed sign-in attempts. Try again in 15 minutes.")
    f = s.scalar(select(Farmer).where(Farmer.email == email))
    password_ok = check_password(body.password, f.password_hash if f else DUMMY_HASH)
    if f is None or not password_ok:
        _login_failures[email] = recent + [now]
        raise HTTPException(401, "Email or password is incorrect.")
    _login_failures.pop(email, None)
    if not f.verified:
        raise HTTPException(403, "Please verify your email first.")
    return {"access_token": token_for(f), "token_type": "bearer", "farmer": farmer_json(f)}


_forecast_cache: dict[tuple, tuple[float, dict]] = {}

FORECAST_TTL = 1800
FORECAST_STALE_TTL = 86400
_weather_rate_limited_until = 0.0


async def forecast(lat: float, lon: float) -> dict:
    global _weather_rate_limited_until

    key = (round(lat, 2), round(lon, 2))
    now = time.time()

    cached = _forecast_cache.get(key)

    # Return fresh cached weather without contacting Open-Meteo.
    if cached and now - cached[0] < FORECAST_TTL:
        return cached[1]

    # Respect the provider cooldown.
    if now < _weather_rate_limited_until:
        if cached and now - cached[0] < FORECAST_STALE_TTL:
            return cached[1]

        raise HTTPException(
            status_code=503,
            detail="Weather service is temporarily busy. Please try again later."
        )

    params = {
        "latitude": lat,
        "longitude": lon,
        "timezone": "auto",
        "forecast_days": 7,
        "daily": (
            "weather_code,temperature_2m_max,temperature_2m_min,"
            "precipitation_sum,precipitation_probability_max,"
            "wind_speed_10m_max"
        ),
        "current": (
            "temperature_2m,relative_humidity_2m,"
            "wind_speed_10m,weather_code"
        ),
    }

    try:
        timeout = httpx.Timeout(25.0, connect=10.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params=params,
            )

            if response.status_code == 429:
                retry_after = response.headers.get("Retry-After")

                try:
                    wait_seconds = max(900, int(retry_after))
                except (TypeError, ValueError):
                    wait_seconds = 1800

                _weather_rate_limited_until = time.time() + wait_seconds

                if cached and time.time() - cached[0] < FORECAST_STALE_TTL:
                    return cached[1]

                raise HTTPException(
                    status_code=503,
                    detail="Weather service is temporarily busy. Please try again later."
                )

            response.raise_for_status()
            data = response.json()

            if not isinstance(data, dict) or "daily" not in data or "current" not in data:
                raise ValueError("Incomplete weather response from Open-Meteo")

            _forecast_cache[key] = (time.time(), data)
            _weather_rate_limited_until = 0.0

            return data

    except HTTPException:
        raise

    except (httpx.RequestError, httpx.HTTPStatusError, ValueError):
        log.exception("Open-Meteo weather request failed")

        if cached and time.time() - cached[0] < FORECAST_STALE_TTL:
            return cached[1]

        raise HTTPException(
            status_code=503,
            detail="Weather service is temporarily unavailable. Please try again later."
        )



def weather_condition(code) -> str:
    table = {0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog"}
    if code in table:
        return table[code]
    if code in (51, 53, 55, 56, 57):
        return "Drizzle"
    if code in (61, 63, 65, 66, 67):
        return "Rain"
    if code in (80, 81, 82):
        return "Rain showers"
    if code in (71, 73, 75, 77, 85, 86):
        return "Snow or hail"
    if code in (95, 96, 99):
        return "Thunderstorm"
    return "Variable conditions"


LEVEL_ORDER = ["info", "good", "caution", "warning", "danger"]


def advice(rain_mm: float, rain_prob: float, tmax: float, wind: float):
    """Simple, conservative rules -> (alert_level, action, detail). Advice is in English for now."""
    if rain_mm >= 40 or (rain_prob >= 80 and rain_mm >= 25):
        return ("danger", "Heavy rain expected. Clear drainage and protect harvested produce.",
                "Delay planting, spraying and fertiliser. Move livestock to higher ground if flooding is possible.")
    if wind >= 60:
        return ("danger", "Very strong winds expected. Secure structures and young trees.",
                "Do not spray. Harvest ripe fruit early and check for damage afterwards.")
    if wind >= 40:
        return ("warning", "Strong winds expected. Stake young trees and secure temporary structures.",
                "Avoid spraying, because the drift wastes chemicals and can harm neighbouring crops.")
    if rain_mm >= 15 or rain_prob >= 70:
        return ("warning", "Rain is likely. Avoid spraying and fertiliser application.",
                "Make sure drainage channels are clear. Rain after spraying washes chemicals away.")
    if tmax >= 35:
        return ("warning", "Very hot day. Water young plants early morning or evening.",
                "Mulch to keep the soil moist and avoid heavy field work in the midday heat.")
    if rain_prob >= 40 or rain_mm >= 5:
        return ("caution", "Some rain is possible. Plan field work for the drier part of the day.",
                "Check the sky before spraying or applying fertiliser.")
    if rain_prob <= 20 and rain_mm < 1:
        if tmax >= 30:
            return ("caution", "Hot and dry. Protect young plants and keep soil covered.",
                    "Water early in the morning or in the evening to reduce losses.")
        return ("good", "Dry, settled weather. A good day for field work, weeding and harvesting.",
                "Forecasts are estimates. Follow local weather warnings.")
    return ("info", "Mixed conditions. Check local field conditions before spraying or applying fertiliser.",
            "Forecasts are estimates. Follow local weather warnings.")


def _num(values, i, default=0.0) -> float:
    try:
        v = values[i]
        return default if v is None else float(v)
    except (IndexError, TypeError, ValueError):
        return default


def day_payload(d: dict, i: int) -> dict:
    rain_mm, prob = _num(d["precipitation_sum"], i), _num(d["precipitation_probability_max"], i)
    tmax, tmin = _num(d["temperature_2m_max"], i), _num(d["temperature_2m_min"], i)
    wind = _num(d.get("wind_speed_10m_max", []), i)
    level, action, detail = advice(rain_mm, prob, tmax, wind)
    return {
        "date": d["time"][i], "condition": weather_condition(d["weather_code"][i]),
        "alert_level": level, "action": action, "detail": detail,
        "rain_mm": rain_mm, "rain_prob_pct": prob, "temp_max_c": tmax, "temp_min_c": tmin, "wind_speed_kmh": wind,
    }


def today_payload(data: dict, name: str) -> dict:
    d, cur = data["daily"], data.get("current", {})
    day = day_payload(d, 0)
    return {
        "location": name, "date": day["date"], "condition": day["condition"],
        "alert_level": day["alert_level"], "action": day["action"], "detail": day["detail"],
        "rain_mm": day["rain_mm"], "rain_prob_pct": day["rain_prob_pct"],
        "temp_max_c": day["temp_max_c"], "temp_min_c": day["temp_min_c"],
        "wind_kmh": cur.get("wind_speed_10m", day["wind_speed_kmh"]), "current_temp_c": cur.get("temperature_2m"),
    }


def week_payload(data: dict, name: str) -> dict:
    days = [day_payload(data["daily"], i) for i in range(len(data["daily"]["time"]))]
    highest = max((x["alert_level"] for x in days), key=LEVEL_ORDER.index, default="info")
    return {"location_name": name, "highest_alert": highest, "days": days}


async def _forecast_or_502(lat: float, lon: float) -> dict:
    try:
        return await forecast(lat, lon)
    except Exception as e:  # network error, timeout, bad status from the provider
        log.error("Open-Meteo request failed: %r", e)
        raise HTTPException(502, "The weather provider is unavailable right now. Please try again.")


@app.get("/forecast/today/{location_key}")
async def today(location_key: str, lang: str = "en"):
    loc = get_loc(location_key)
    return today_payload(await _forecast_or_502(loc["latitude"], loc["longitude"]), loc["name"])


@app.get("/forecast/location/{location_key}")
async def week(location_key: str, lang: str = "en"):
    loc = get_loc(location_key)
    return week_payload(await _forecast_or_502(loc["latitude"], loc["longitude"]), loc["name"])


@app.get("/forecast/coords")
async def coords(lat: float, lon: float, lang: str = "en"):
    if not (-35 <= lat <= 20 and 20 <= lon <= 55):
        raise HTTPException(400, "Coordinates are outside the supported East Africa region.")
    return today_payload(await _forecast_or_502(lat, lon), f"{lat:.3f}, {lon:.3f}")
