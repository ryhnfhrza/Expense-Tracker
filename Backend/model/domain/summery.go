package domain

type ExpenseRecord struct {
	Amount      float64
	Date        string
	Description string
}

type SummaryDetail struct {
	CategoryName string
	Records      []ExpenseRecord
	Total        float64
}

type SummaryFilter struct {
	CategoryId  *int
	Day         *int
	Month       *int
	Year        *int
	Description *string
}
