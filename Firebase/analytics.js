import { getAnalytics, isSupported, logEvent, setUserProperties } from "firebase/analytics"
import firebase_app from "./FirebaseInit"

let analyticsPromise = null

export async function getFirebaseAnalytics() {
  if (typeof window === "undefined" || process.env.NEXT_PUBLIC_ARENA_DEV === "true") return null
  if (!firebase_app?.options?.measurementId) return null

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(firebase_app) : null))
      .catch((error) => {
        console.error("Firebase Analytics is not available:", error)
        return null
      })
  }

  return analyticsPromise
}

export async function trackPageView(url) {
  const analytics = await getFirebaseAnalytics()
  if (!analytics || typeof window === "undefined") return

  logEvent(analytics, "page_view", {
    page_path: url,
    page_location: window.location.href,
    page_title: document.title,
  })
}

export async function trackVisitorLocationContext(url) {
  const analytics = await getFirebaseAnalytics()
  if (!analytics || typeof window === "undefined") return

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown"
  const language = navigator.language || "unknown"
  const languages = Array.isArray(navigator.languages) ? navigator.languages.join(",") : language

  setUserProperties(analytics, {
    visitor_timezone: timezone,
    visitor_language: language,
  })

  logEvent(analytics, "visitor_location_context", {
    page_path: url,
    timezone,
    language,
    languages,
  })
}
