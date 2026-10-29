import YahooFinance from "yahoo-finance2";

// Yahoo Finance는 서버에서만 호출한다(CORS·쿠키 제약).
export const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
