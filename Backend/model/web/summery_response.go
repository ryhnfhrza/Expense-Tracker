package web

type SummaryDetailResponse struct {
	CategoryName string                  `json:"category_name"`
	Records      []ExpenseRecordResponse `json:"records"`
	Total        float64                 `json:"total"`
}

type ExpenseRecordResponse struct {
	Amount      float64 `json:"amount"`
	Date        string  `json:"date"`
	Description string  `json:"description"`
}

type SummaryResponse struct {
	TotalAll   float64                 `json:"total_all"`
	Categories []SummaryDetailResponse `json:"categories"`
}
