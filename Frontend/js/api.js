// js/api.js
const BASE_URL = "http://localhost:8080/api";

function buildHeaders(token, extra = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.append(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

async function parseJson(res) {
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    ok: res.ok,
    status: res.status,
    raw: json,
    data: json?.data ?? json,
  };
}

export const API = {
  _token: null,

  setToken(token) {
    this._token = token;
  },
  useToken(token) {
    this._token = token;
  },

  async login(body) {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: buildHeaders(null),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },

  async register(body) {
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: buildHeaders(null),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },

  async verifyEmail(body) {
    const res = await fetch(`${BASE_URL}/verify-email`, {
      method: "POST",
      eaders: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return parseJson(res);
  },

  async getCategories() {
    const res = await fetch(`${BASE_URL}/category`, {
      headers: buildHeaders(this._token),
    });
    return parseJson(res);
  },

  async addCategory(body) {
    const res = await fetch(`${BASE_URL}/category`, {
      method: "POST",
      headers: buildHeaders(this._token),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },

  async deleteCategory(id) {
    const res = await fetch(`${BASE_URL}/category/${id}`, {
      method: "DELETE",
      headers: buildHeaders(this._token),
    });
    return parseJson(res);
  },

  async getExpenses(params = {}) {
    const url = `${BASE_URL}/expense${toQuery(params)}`;
    const res = await fetch(url, {
      headers: buildHeaders(this._token),
    });
    return parseJson(res);
  },

  async addExpense(body) {
    const res = await fetch(`${BASE_URL}/expense`, {
      method: "POST",
      headers: buildHeaders(this._token),
      body: JSON.stringify(body),
    });
    return parseJson(res);
  },

  async updateExpense(id, body) {
    const res = await fetch(`${BASE_URL}/expense/${id}`, {
      method: "PUT",
      headers: buildHeaders(this._token),
      body: JSON.stringify(body),
    });
    if (res.status === 404) {
      const res2 = await fetch(`${BASE_URL}/expense/${id}`, {
        method: "PUT",
        headers: buildHeaders(this._token),
        body: JSON.stringify(body),
      });
      return parseJson(res2);
    }
    return parseJson(res);
  },

  async deleteExpense(id) {
    const res = await fetch(`${BASE_URL}/expense/${id}`, {
      method: "DELETE",
      headers: buildHeaders(this._token),
    });
    if (res.status === 404) {
      const res2 = await fetch(`${BASE_URL}/expense/${id}`, {
        method: "DELETE",
        headers: buildHeaders(this._token),
      });
      return parseJson(res2);
    }
    return parseJson(res);
  },

  async getExpenseById(id) {
    const res = await fetch(`${BASE_URL}/expense/${id}`, {
      headers: buildHeaders(this._token),
    });
    if (res.status === 404) {
      const res2 = await fetch(`${BASE_URL}/expense/${id}`, {
        headers: buildHeaders(this._token),
      });
      return parseJson(res2);
    }
    return parseJson(res);
  },

  async getSummaryDetails(params = {}) {
    const url = `${BASE_URL}/expenses/summary/details${toQuery(params)}`;
    const res = await fetch(url, {
      headers: buildHeaders(this._token),
    });
    return parseJson(res);
  },
};
