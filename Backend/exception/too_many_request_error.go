package exception

type TooManyRequestError struct {
	Message string
}

func (e *TooManyRequestError) Error() string {
	return e.Message
}

func NewTooManyRequestError(message string) *TooManyRequestError {
	return &TooManyRequestError{Message: message}
}
