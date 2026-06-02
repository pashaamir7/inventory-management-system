import api from "./client";

export const getCustomers  = (params) => api.get("/customers", { params }).then((r) => r.data);
export const getCustomer   = (id)     => api.get(`/customers/${id}`).then((r) => r.data);
export const createCustomer = (data)  => api.post("/customers", data).then((r) => r.data);
export const deleteCustomer = (id)    => api.delete(`/customers/${id}`).then((r) => r.data);
