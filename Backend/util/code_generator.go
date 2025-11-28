package util

import (
	"crypto/rand"
	"fmt"
	"io"
)

func Generate6DigitCode() (string, error) {
	var n uint32
	b := make([]byte, 4)
	if _, err := io.ReadFull(rand.Reader, b); err != nil {
		return "", err
	}
	n = uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])
	code := n % 1000000
	return fmt.Sprintf("%06d", code), nil
}
