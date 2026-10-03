/**
 * [HTTP CLIENT]
 * Single Axios instance used for every ranking / history call.
 * The timeout can be shortened in tests with `?apiTimeout=500`.
 */
import axios from "axios";
import { runtimeParams } from "../runtimeParams";

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: runtimeParams.apiTimeoutMs,
  headers: { "Content-Type": "application/json" },
});
