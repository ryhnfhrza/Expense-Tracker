package helper

import (
	"errors"
	"time"
)

func ParseFlexibleDate(input string, userTZ string) (time.Time, error) {
	formats := []string{
		time.RFC3339,
		"2006-01-02T15:04",
		"2006-01-02",
		"2006-01-02 15:04:05",
	}

	loc, err := time.LoadLocation(userTZ)
	if err != nil {
		loc = time.UTC
	}

	for _, f := range formats {
		if t, err := time.ParseInLocation(f, input, loc); err == nil {
			return t, nil
		}
	}

	return time.Time{}, errors.New("invalid date format")
}
