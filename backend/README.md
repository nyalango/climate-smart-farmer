# Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows   (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
cp .env.example .env            # Windows: copy .env.example .env   -> then fill it in
python test_email.py you@gmail.com        # verify email works BEFORE starting the app
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

* `--host 0.0.0.0` is required so a phone can reach the server.
* Open `http://localhost:8000/health` - it shows `"email_configured": true` when SMTP is set.
* Windows may ask to allow Python through the firewall: allow it on **Private networks**.
