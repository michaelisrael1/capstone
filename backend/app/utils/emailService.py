import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


class EmailService:
    def __init__(self):
        self.host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.port = int(os.getenv("SMTP_PORT", 587))
        self.user = os.getenv("SMTP_USER")
        self.password = os.getenv("SMTP_PASSWORD")
        self.from_addr = os.getenv("SMTP_FROM", self.user)

    def send_email(self, to: str | list[str], subject: str, body: str, html: bool = False) -> bool:
        """
        Send an email. Returns True on success, raises on failure.
        to: single address string or list of addresses.
        html: if True, body is sent as HTML; otherwise plain text.
        """
        recipients = [to] if isinstance(to, str) else to

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_addr
        msg["To"] = ", ".join(recipients)

        mime_type = "html" if html else "plain"
        msg.attach(MIMEText(body, mime_type))

        with smtplib.SMTP(self.host, self.port) as server:
            server.ehlo()
            server.starttls()
            server.login(self.user, self.password)
            server.sendmail(self.from_addr, recipients, msg.as_string())

        return True
