"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow, format } from "date-fns"

interface ActivityTimestampProps {
  date: string;
}

export function ActivityTimestamp({ date }: ActivityTimestampProps) {
  const [mounted, setMounted] = useState(false)
  const [relativeTime, setRelativeTime] = useState("")
  
  const dateObj = new Date(date)

  useEffect(() => {
    const updateTime = () => setRelativeTime(formatDistanceToNow(new Date(date), { addSuffix: true }))
    
    setMounted(true)
    updateTime()
    
    // Refresh the relative time every minute to keep it accurate
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [date]) // Note: dateObj is not in dependency array because we only care about the date string changing

  // suppressHydrationWarning used as a secondary safeguard for timezone differences
  return (
    <span suppressHydrationWarning title={format(dateObj, 'PPpp')}>
      {mounted ? relativeTime : format(dateObj, 'PPpp')}
    </span>
  )
}
