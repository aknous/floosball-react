import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://wmrhmnoruguzvoysnyax.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtcmhtbm9ydWd1enZveXNueWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMxNjgxNTksImV4cCI6MjA0ODc0NDE1OX0._rILw_vZl_8IFpDkMkTunObHqQHO9bDrl4zYHSLryVg"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)