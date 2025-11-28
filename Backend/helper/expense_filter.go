package helper

import (
	"fmt"
	"net/url"
	"strconv"

	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
)

func ParseExpenseFilter(query url.Values) (domain.ExpenseFilter, error) {
	var filter domain.ExpenseFilter

	tz := query.Get("tz")
	if tz == "" {
		tz = "Asia/Jakarta"
	}

	if catStr := query.Get("category_id"); catStr != "" {
		catID, err := strconv.Atoi(catStr)
		if err != nil || catID <= 0 {
			return filter, fmt.Errorf("invalid category_id")
		}
		filter.CategoryId = &catID
	}

	if minStr := query.Get("min_amount"); minStr != "" {
		minVal, err := strconv.ParseFloat(minStr, 64)
		if err != nil {
			return filter, fmt.Errorf("invalid min_amount")
		}
		filter.MinAmount = &minVal
	}

	if maxStr := query.Get("max_amount"); maxStr != "" {
		maxVal, err := strconv.ParseFloat(maxStr, 64)
		if err != nil {
			return filter, fmt.Errorf("invalid max_amount")
		}
		filter.MaxAmount = &maxVal
	}

	if cbStr := query.Get("created_before"); cbStr != "" {
		parsed, err := ParseFlexibleDate(cbStr, tz)
		if err != nil {
			return filter, fmt.Errorf("invalid created_before format: use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS")
		}
		utc := parsed.UTC()
		filter.CreatedBefore = &utc
	}

	if caStr := query.Get("created_after"); caStr != "" {
		parsed, err := ParseFlexibleDate(caStr, tz)
		if err != nil {
			return filter, fmt.Errorf("invalid created_after format: use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS")
		}
		utc := parsed.UTC()
		filter.CreatedAfter = &utc
	}

	filter.SortBy = query.Get("sort_by")

	filter.Order = query.Get("order")

	if limitStr := query.Get("limit"); limitStr != "" {
		l, err := strconv.Atoi(limitStr)
		if err != nil || l < 0 {
			return filter, fmt.Errorf("invalid limit")
		}
		filter.Limit = l
	}

	if offsetStr := query.Get("offset"); offsetStr != "" {
		o, err := strconv.Atoi(offsetStr)
		if err != nil || o < 0 {
			return filter, fmt.Errorf("invalid offset")
		}
		filter.Offset = o
	}
	if descStr := query.Get("description"); descStr != "" {
    filter.Description = &descStr
	}


	return filter, nil
}
