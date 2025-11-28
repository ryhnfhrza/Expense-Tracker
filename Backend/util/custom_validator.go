package util

import (
	"regexp"

	"github.com/go-playground/validator/v10"
)

var (
	lower = regexp.MustCompile(`[a-z]`)
	upper = regexp.MustCompile(`[A-Z]`)
	digit = regexp.MustCompile(`\d`)
)

func RegisterValidations(validate *validator.Validate) {
	validate.RegisterValidation("passComplex", func(fl validator.FieldLevel) bool {
		pw := fl.Field().String()
		if len(pw) < 8 {
			return false
		}
		return lower.MatchString(pw) &&
			upper.MatchString(pw) &&
			digit.MatchString(pw)
	})
}
