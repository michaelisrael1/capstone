import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage


logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.port = int(os.getenv("SMTP_PORT", 587))
        self.user = os.getenv("SMTP_USER")
        self.password = os.getenv("SMTP_PASSWORD")
        self.from_addr = os.getenv("SMTP_FROM", self.user)

    def _get_email_footer(self) -> str:
        """Return the standard email footer with disclaimer."""
        return """
<hr style="border:none; border-top:1px solid #cccccc; margin:20px 0;">
<div style="font-family:Arial,sans-serif; font-size:11px; color:#666666; line-height:1.5;">
    <p style="margin:10px 0;">
        <img src="cid:madonna_logo" alt="Madonna Ability Alliance" style="height:50px; margin-bottom:10px;">
    </p>
    <p style="margin:10px 0;"><strong>CONFIDENTIALITY NOTICE</strong></p>
    <p style="margin:10px 0;">
        This communication, along with any attachments, is covered by federal and state law governing electronic
        communications and may contain confidential and legally privileged information. It is intended only for the
        person to whom it is addressed. If you are not an addressee, or responsible for delivering these documents
        to an addressee, you are hereby notified that any dissemination, distribution, retention, use or copying of
        this message is strictly prohibited. If you have received this message in error, immediately and delete all 
        copies of this message.
    </p>
    <p style="margin:10px 0;">
        <em>Madonna Ability Alliance</em>
    </p>
</div>
"""

    def send_email(self, to: str | list[str], subject: str, body: str, html: bool = False) -> bool:
        """
        Send an email with footer and logo. Returns True on success, raises on failure.
        to: single address string or list of addresses.
        html: if True, body is sent as HTML; otherwise plain text.
        """
        recipients = [to] if isinstance(to, str) else to

        msg = MIMEMultipart("related")
        msg_alt = MIMEMultipart("alternative")
        msg.attach(msg_alt)

        msg["Subject"] = subject
        msg["From"] = self.from_addr
        msg["To"] = ", ".join(recipients)

        # Add footer to body
        if html:
            full_body = body + self._get_email_footer()
            msg_alt.attach(MIMEText(full_body, "html"))
        else:
            # For plain text, add a text version of the footer
            footer_text = """
---
CONFIDENTIALITY NOTICE

This communication, along with any attachments, is covered by federal and state law governing electronic
communications and may contain confidential and legally privileged information. It is intended only for the
person to whom it is addressed. If you are not an addressee, or responsible for delivering these documents
to an addressee, you are hereby notified that any dissemination, distribution, retention, use or copying of
this message is strictly prohibited. If you have received this message in error, please notify the sender
immediately and delete all copies of this message.

Madonna Ability Alliance
"""
            full_body = body + footer_text
            msg_alt.attach(MIMEText(full_body, "plain"))

        # Attach logo for HTML emails
        if html:
            try:
                # Path: backend/app/utils/emailService.py -> ../../assets/images/madonna-logo.jpeg
                logo_path = os.path.join(os.path.dirname(__file__), "../../assets/images/madonna-logo.jpeg")
                if os.path.exists(logo_path):
                    with open(logo_path, "rb") as logo_file:
                        logo = MIMEImage(logo_file.read(), "jpeg")
                        logo.add_header("Content-ID", "<madonna_logo>")
                        logo.add_header("Content-Disposition", "inline", filename="madonna-logo.jpeg")
                        msg.attach(logo)
                else:
                    logger.warning(f"Logo file not found at {logo_path}")
            except Exception as e:
                logger.warning(f"Failed to attach logo: {e}")

        try:
            with smtplib.SMTP(self.host, self.port) as server:
                server.ehlo()
                server.starttls()
                server.login(self.user, self.password)
                server.sendmail(self.from_addr, recipients, msg.as_string())
            logger.info(f"Email sent successfully to {len(recipients)} recipient(s)")
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP authentication failed: {e}")
            raise
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error sending email: {e}")
            raise

        return True
