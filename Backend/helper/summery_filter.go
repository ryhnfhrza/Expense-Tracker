package helper

import (
	"fmt"
	"net/url"
	"strconv"
	"time"

	"github.com/ryhnfhrza/Expense-Tracker/model/domain"
)

func ParseSummaryFilter(query url.Values) (domain.SummaryFilter, error) {
	var filter domain.SummaryFilter

	if catStr := query.Get("category_id"); catStr != "" {
		catID, err := strconv.Atoi(catStr)
		if err != nil || catID <= 0 {
			return filter, fmt.Errorf("invalid category_id")
		}
		filter.CategoryId = &catID
	}

	if dayStr := query.Get("day"); dayStr != "" {
		dayVal, err := strconv.Atoi(dayStr)
		if err != nil || dayVal < 1 || dayVal > 31 {
			return filter, fmt.Errorf("invalid day")
		}
		filter.Day = &dayVal
	}

	if monthStr := query.Get("month"); monthStr != "" {
		monthVal, err := strconv.Atoi(monthStr)
		if err != nil || monthVal < 1 || monthVal > 12 {
			return filter, fmt.Errorf("invalid month")
		}
		filter.Month = &monthVal
	}

	if yearStr := query.Get("year"); yearStr != "" {
		yearVal, err := strconv.Atoi(yearStr)
		if err != nil {
			return filter, fmt.Errorf("invalid year")
		}
		filter.Year = &yearVal
	}
	if descStr := query.Get("description"); descStr != "" {
		filter.Description = &descStr
	}

	if filter.Day != nil && (filter.Month == nil || filter.Year == nil) {
		return filter, fmt.Errorf("day requires month and year")
	}

	if filter.Month != nil && filter.Year == nil {
		return filter, fmt.Errorf("month requires year")
	}

	if filter.Day != nil && filter.Month != nil && filter.Year != nil {
		dateStr := fmt.Sprintf("%04d-%02d-%02d", *filter.Year, *filter.Month, *filter.Day)
		if _, err := time.Parse("2006-01-02", dateStr); err != nil {
			return filter, fmt.Errorf("invalid date combination")
		}
	}

	return filter, nil
}
