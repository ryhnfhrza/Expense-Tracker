package helper

import (
	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
	"github.com/ryhnfhrza/Expense-Tracker/model/web"
)

func ToUserResponse(user domain.User) web.UserResponse {
	return web.UserResponse{
		Username: user.Username,
		Email:    user.Email,
	}
}
func ToUserLoginResponse(user domain.User, token string) web.UserLoginResponse {
	return web.UserLoginResponse{
		Id:       user.Id,
		Username: user.Username,
		Email:    user.Email,
		Token:    token,
	}
}

func ToCategoryResponse(category domain.Category) web.CategoryResponse {
	return web.CategoryResponse{
		Id:   category.Id,
		Name: category.Name,
	}
}

func ToCategoryResponses(categories []domain.Category) []web.CategoryResponse {
	var categoryResponses []web.CategoryResponse
	for _, category := range categories {
		categoryResponses = append(categoryResponses, ToCategoryResponse(category))
	}

	return categoryResponses
}

func ToExpenseResponse(expense domain.Expense, categoryName string) web.ExpenseResponse {
	return web.ExpenseResponse{
		Id:           expense.Id,
		CategoryId:   expense.CategoryId,
		CategoryName: categoryName,
		Description:  expense.Description,
		Amount:       expense.Amount,
		CreatedAt:    expense.CreatedAt,
	}
}

func ToExpenseResponses(expenses []domain.Expense, categories []domain.Category) []web.ExpenseResponse {

	categoryMap := make(map[int]string)
	for _, c := range categories {
		categoryMap[c.Id] = c.Name
	}

	var expenseResponses []web.ExpenseResponse
	for _, expense := range expenses {
		categoryName := categoryMap[expense.CategoryId]
		expenseResponses = append(expenseResponses, ToExpenseResponse(expense, categoryName))
	}
	return expenseResponses
}

func ToExpenseRecordResponse(record domain.ExpenseRecord) web.ExpenseRecordResponse {
	return web.ExpenseRecordResponse{
		Amount:      record.Amount,
		Date:        record.Date,
		Description: record.Description,
	}
}

func ToExpenseRecordResponses(records []domain.ExpenseRecord) []web.ExpenseRecordResponse {
	var responses []web.ExpenseRecordResponse
	for _, r := range records {
		responses = append(responses, ToExpenseRecordResponse(r))
	}
	return responses
}

func ToSummaryResponse(detail domain.SummaryDetail) web.SummaryDetailResponse {
	return web.SummaryDetailResponse{
		CategoryName: detail.CategoryName,
		Records:      ToExpenseRecordResponses(detail.Records),
		Total:        detail.Total,
	}
}

func ToSummaryResponses(details []domain.SummaryDetail) []web.SummaryDetailResponse {
	var response []web.SummaryDetailResponse
	for _, d := range details {
		response = append(response, ToSummaryResponse(d))
	}
	return response
}

func ToSummaryResult(totalAll float64, details []domain.SummaryDetail) web.SummaryResponse {
	return web.SummaryResponse{
		TotalAll:   totalAll,
		Categories: ToSummaryResponses(details),
	}
}
