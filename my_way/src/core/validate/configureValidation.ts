import { z } from 'zod'

// Use ordinary parsing: production CSP disallows Zod's eval-based fast path.
const validationConfig = { ...z.config(), jitless: true }
z.config(validationConfig)
