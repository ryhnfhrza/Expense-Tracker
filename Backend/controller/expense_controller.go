package controller

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

type ExpenseController interface {
	CreateExpense(writer http.ResponseWriter, request *http.Request, params httprouter.Params)
	UpdateExpense(writer http.ResponseWriter, request *http.Request, params httprouter.Params)
	DeleteExpense(writer http.ResponseWriter, request *http.Request, params httprouter.Params)
	FindExpenseById(writer http.ResponseWriter, request *http.Request, params httprouter.Params)
	FindAllExpense(writer http.ResponseWriter, request *http.Request, params httprouter.Params)
	GetSummeryDetails(writer http.ResponseWriter, request *http.Request, params httprouter.Params)
}
