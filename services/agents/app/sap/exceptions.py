class SAPError(Exception):
    """Base exception for SAP Service Layer errors."""

    def __init__(self, message: str, status_code: int | None = None, detail: dict | None = None):
        self.message = message
        self.status_code = status_code
        self.detail = detail or {}
        super().__init__(self.message)


class SAPAuthError(SAPError):
    """Authentication failed or session expired."""

    def __init__(self, message: str = "SAP authentication failed", **kwargs):
        super().__init__(message, status_code=401, **kwargs)


class SAPNotFoundError(SAPError):
    """Requested entity not found in SAP."""

    def __init__(self, message: str = "Entity not found", **kwargs):
        super().__init__(message, status_code=404, **kwargs)


class SAPValidationError(SAPError):
    """SAP rejected the request due to validation."""

    def __init__(self, message: str = "Validation error", **kwargs):
        super().__init__(message, status_code=400, **kwargs)
