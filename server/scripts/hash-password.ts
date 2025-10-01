import bcrypt from 'bcryptjs'

const password = process.argv[2]

if (!password) {
  console.error('Usage: npm run hash-password <password>')
  process.exit(1)
}

const roundsEnv = process.env.BCRYPT_SALT_ROUNDS
const saltRounds = Number.parseInt(roundsEnv ?? '12', 10)

if (!Number.isFinite(saltRounds) || saltRounds < 4) {
  console.warn(
    `Invalid BCRYPT_SALT_ROUNDS value (${roundsEnv}). Falling back to 12 rounds for hashing.`,
  )
}

const rounds = Number.isFinite(saltRounds) && saltRounds >= 4 ? saltRounds : 12

bcrypt
  .hash(password, rounds)
  .then((hash) => {
    console.log(hash)
  })
  .catch((error) => {
    console.error('Failed to generate password hash', error)
    process.exitCode = 1
  })
