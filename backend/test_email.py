"""Check your email setup in 10 seconds:   python test_email.py someone@gmail.com

Sends a real verification-style email and prints the EXACT reason if it fails
(wrong App Password, blocked network, wrong port, ...).
"""
import sys

from main import SmtpSettings, build_message, deliver

if len(sys.argv) != 2 or "@" not in sys.argv[1]:
    sys.exit("Usage: python test_email.py recipient@example.com")

cfg = SmtpSettings()
print(f"SMTP host: {cfg.host or '(missing)'}:{cfg.port}  STARTTLS={cfg.starttls}")
print(f"Login as : {cfg.user or '(missing)'}   password set: {bool(cfg.password)} ({len(cfg.password)} chars)")
print(f"From     : {cfg.sender or '(missing)'}")
if not cfg.configured:
    sys.exit("\nFAILED: SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM must all be set in backend/.env")

try:
    deliver(cfg, build_message(sys.argv[1], "123456", cfg.sender, "Test"))
except Exception as e:  # show the real error, not a friendly summary
    print(f"\nFAILED: {type(e).__name__}: {e}")
    text = str(e)
    if "534" in text or "535" in text or "Username and Password not accepted" in text or "Application-specific" in text:
        print("-> Gmail rejected the login. Use a 16-character App Password (not your normal password); 2-Step Verification must be ON.")
    elif "timed out" in text or "Network is unreachable" in text or "Connection refused" in text:
        print("-> Cannot reach the SMTP server. Check your internet/firewall, and that port 587 (or 465) is not blocked.")
    sys.exit(1)
print(f"\nOK: test email sent to {sys.argv[1]}. Check the inbox (and spam).")
