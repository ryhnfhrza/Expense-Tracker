package controller

import (
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/ryhnfhrza/Expense-Tracker/exception"
	"github.com/ryhnfhrza/Expense-Tracker/helper"
	"github.com/ryhnfhrza/Expense-Tracker/model/web"
	"github.com/ryhnfhrza/Expense-Tracker/service"
)

type expenseControllerImpl struct {
	ExpenseService service.ExpenseService
}

func NewExpenseController(expenseService service.ExpenseService) ExpenseController {
	return &expenseControllerImpl{
		ExpenseService: expenseService,
	}
}

func (expenseController *expenseControllerImpl) CreateExpense(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	expenseCreateRequest := web.ExpenseCreateRequest{}
	helper.ReadFromRequestBody(request, &expenseCreateRequest)

	userId, ok := helper.GetUserIDFromContext(request.Context())
	if !ok {
		http.Error(writer, "unauthorized", http.StatusUnauthorized)
		return
	}
	expenseCreateRequest.UserId = userId

	expenseResponse := expenseController.ExpenseService.CreateExpense(request.Context(), expenseCreateRequest)

	webResponse := web.WebResponse{
		Code:   http.StatusCreated,
		Status: "Created",
		Data:   expenseResponse,
	}

	helper.WriteToResponseBody(writer, webResponse)
}

func (expenseController *expenseControllerImpl) UpdateExpense(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	expenseUpdateRequest := web.ExpenseUpdateRequest{}
	helper.ReadFromRequestBody(request, &expenseUpdateRequest)

	expenseIdString := params.ByName("expenseId")
	expenseId, err := strconv.Atoi(expenseIdString)
	helper.PanicIfError(err)

	expenseUpdateRequest.Id = expenseId

	userId, ok := helper.GetUserIDFromContext(request.Context())
	if !ok {
		http.Error(writer, "unauthorized", http.StatusUnauthorized)
		return
	}

	expenseUpdateRequest.UserId = userId

	expenseResponse := expenseController.ExpenseService.UpdateExpense(request.Context(), expenseUpdateRequest)

	webResponse := web.WebResponse{
		Code:   http.StatusOK,
		Status: "OK",
		Data:   expenseResponse,
	}

	helper.WriteToResponseBody(writer, webResponse)
}

func (expenseController *expenseControllerImpl) DeleteExpense(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	expenseIdString := params.ByName("expenseId")
	expenseId, err := strconv.Atoi(expenseIdString)
	helper.PanicIfError(err)

	userId, ok := helper.GetUserIDFromContext(request.Context())
	if !ok {
		http.Error(writer, "unauthorized", http.StatusUnauthorized)
		return
	}

	expenseController.ExpenseService.DeleteExpense(request.Context(), expenseId, userId)

	webResponse := web.WebResponse{
		Code:   http.StatusNoContent,
		Status: "NO CONTENT",
	}

	helper.WriteToResponseBody(writer, webResponse)
}

func (expenseController *expenseControllerImpl) FindExpenseById(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	expenseIdString := params.ByName("expenseId")
	expenseId, err := strconv.Atoi(expenseIdString)
	helper.PanicIfError(err)

	userId, ok := helper.GetUserIDFromContext(request.Context())
	if !ok {
		http.Error(writer, "unauthorized", http.StatusUnauthorized)
		return
	}

	expenseResponse := expenseController.ExpenseService.FindExpenseById(request.Context(), expenseId, userId)

	webResponse := web.WebResponse{
		Code:   http.StatusOK,
		Status: "OK",
		Data:   expenseResponse,
	}

	helper.WriteToResponseBody(writer, webResponse)
}

func (expenseController *expenseControllerImpl) FindAllExpense(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	userId, ok := helper.GetUserIDFromContext(request.Context())
	if !ok {
		http.Error(writer, "unauthorized", http.StatusUnauthorized)
		return
	}

	filter, err := helper.ParseExpenseFilter(request.URL.Query())
	if err != nil {
		panic(exception.NewBadRequest(err.Error()))
	}

	expenseResponses := expenseController.
		ExpenseService.
		FindAllExpense(request.Context(), userId, filter)

	webResponse := web.WebResponse{
		Code:   http.StatusOK,
		Status: "OK",
		Data:   expenseResponses,
	}
	helper.WriteToResponseBody(writer, webResponse)
}
func (expenseController *expenseControllerImpl) GetSummeryDetails(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	userId, ok := helper.GetUserIDFromContext(request.Context())
	if !ok {
		http.Error(writer, "unauthorized", http.StatusUnauthorized)
		return
	}

	filter, err := helper.ParseSummaryFilter(request.URL.Query())
	if err != nil {
		panic(exception.NewBadRequest(err.Error()))
	}

	summaryResponse := expenseController.
		ExpenseService.
		GetSummaryDetails(request.Context(), userId, filter)

	webResponse := web.WebResponse{
		Code:   http.StatusOK,
		Status: "OK",
		Data:   summaryResponse,
	}

	helper.WriteToResponseBody(writer, webResponse)
}
