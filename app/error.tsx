"use client";

export default function Error({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return <main className="status-screen"><p role="alert">StockFlow could not load. Please try again.</p><button className="primary-button" onClick={reset} type="button">Try again</button></main>;
}