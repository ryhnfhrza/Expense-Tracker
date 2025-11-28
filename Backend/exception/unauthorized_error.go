package exception

type UnauthorizedError struct {
	Message string
}

func (e *UnauthorizedError) Error() string {
	return e.Message
}

func NewUnauthorizedError(msg string) error {
	return &UnauthorizedError{Message: msg}
}
