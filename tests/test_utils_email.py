import pytest
from unittest.mock import patch, MagicMock
from utils.emailService import EmailService


class TestEmailServiceInit:
    def test_init_with_env_vars(self, monkeypatch):
        monkeypatch.setenv("SMTP_HOST", "custom.smtp.com")
        monkeypatch.setenv("SMTP_PORT", "2525")
        monkeypatch.setenv("SMTP_USER", "user@custom.com")
        monkeypatch.setenv("SMTP_PASSWORD", "custompass")
        monkeypatch.setenv("SMTP_FROM", "sender@custom.com")

        service = EmailService()
        assert service.host == "custom.smtp.com"
        assert service.port == 2525
        assert service.user == "user@custom.com"
        assert service.password == "custompass"
        assert service.from_addr == "sender@custom.com"

    def test_init_with_defaults(self, monkeypatch):
        monkeypatch.delenv("SMTP_HOST", raising=False)
        monkeypatch.delenv("SMTP_PORT", raising=False)
        monkeypatch.delenv("SMTP_USER", raising=False)
        monkeypatch.delenv("SMTP_PASSWORD", raising=False)
        monkeypatch.delenv("SMTP_FROM", raising=False)

        service = EmailService()
        assert service.host == "smtp.gmail.com"
        assert service.port == 587


class TestEmailServiceSend:
    def test_send_email_single_recipient(self, monkeypatch):
        monkeypatch.setenv("SMTP_USER", "test@gmail.com")
        monkeypatch.setenv("SMTP_PASSWORD", "testpass")

        with patch("utils.emailService.smtplib.SMTP") as MockSMTP:
            mock_server = MagicMock()
            MockSMTP.return_value.__enter__.return_value = mock_server
            MockSMTP.return_value.__exit__.return_value = False

            service = EmailService()
            result = service.send_email("recipient@example.com", "Subject", "Body")

            assert result is True
            mock_server.starttls.assert_called_once()
            mock_server.login.assert_called_once()
            mock_server.sendmail.assert_called_once()

    def test_send_email_multiple_recipients(self, monkeypatch):
        monkeypatch.setenv("SMTP_USER", "test@gmail.com")
        monkeypatch.setenv("SMTP_PASSWORD", "testpass")

        with patch("utils.emailService.smtplib.SMTP") as MockSMTP:
            mock_server = MagicMock()
            MockSMTP.return_value.__enter__.return_value = mock_server
            MockSMTP.return_value.__exit__.return_value = False

            service = EmailService()
            result = service.send_email(
                ["recipient1@example.com", "recipient2@example.com"],
                "Subject",
                "Body"
            )

            assert result is True
            mock_server.sendmail.assert_called_once()

    def test_send_email_html_mode(self, monkeypatch):
        monkeypatch.setenv("SMTP_USER", "test@gmail.com")
        monkeypatch.setenv("SMTP_PASSWORD", "testpass")

        with patch("utils.emailService.smtplib.SMTP") as MockSMTP:
            mock_server = MagicMock()
            MockSMTP.return_value.__enter__.return_value = mock_server
            MockSMTP.return_value.__exit__.return_value = False

            service = EmailService()
            result = service.send_email("to@example.com", "Subject", "<html>Body</html>", html=True)

            assert result is True

    def test_send_email_plain_text_mode(self, monkeypatch):
        monkeypatch.setenv("SMTP_USER", "test@gmail.com")
        monkeypatch.setenv("SMTP_PASSWORD", "testpass")

        with patch("utils.emailService.smtplib.SMTP") as MockSMTP:
            mock_server = MagicMock()
            MockSMTP.return_value.__enter__.return_value = mock_server
            MockSMTP.return_value.__exit__.return_value = False

            service = EmailService()
            result = service.send_email("to@example.com", "Subject", "Plain text body", html=False)

            assert result is True

    def test_send_email_smtp_exception_propagates(self, monkeypatch):
        monkeypatch.setenv("SMTP_USER", "test@gmail.com")
        monkeypatch.setenv("SMTP_PASSWORD", "testpass")

        with patch("utils.emailService.smtplib.SMTP") as MockSMTP:
            mock_server = MagicMock()
            mock_server.login.side_effect = Exception("SMTP Error")
            MockSMTP.return_value.__enter__.return_value = mock_server
            MockSMTP.return_value.__exit__.return_value = False

            service = EmailService()
            with pytest.raises(Exception, match="SMTP Error"):
                service.send_email("to@example.com", "Subject", "Body")

    def test_send_email_from_addr_defaults_to_user(self, monkeypatch):
        monkeypatch.setenv("SMTP_USER", "user@example.com")
        monkeypatch.setenv("SMTP_PASSWORD", "pass")
        monkeypatch.delenv("SMTP_FROM", raising=False)

        service = EmailService()
        assert service.from_addr == "user@example.com"

    def test_send_email_from_addr_custom(self, monkeypatch):
        monkeypatch.setenv("SMTP_USER", "user@example.com")
        monkeypatch.setenv("SMTP_PASSWORD", "pass")
        monkeypatch.setenv("SMTP_FROM", "custom@example.com")

        service = EmailService()
        assert service.from_addr == "custom@example.com"
