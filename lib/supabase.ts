import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://lsrxzgeiazkwzslvxpuu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzcnh6Z2VpYXprd3pzbHZ4cHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTI3OTQsImV4cCI6MjA5Nzg4ODc5NH0.FxV3ibMmn70FPZ499G7CxYn8_-VaiNvYKaTd1MXmGdk"
);