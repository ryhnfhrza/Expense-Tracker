package domain

import "time"

type Expense struct {
	Id          int
	CategoryId  int
	Description string
	Amount      float64
	CreatedAt   time.Time
	UserId      int
}
