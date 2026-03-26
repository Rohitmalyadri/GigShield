// mockWorkers.js
// The workerHash values are the SHA-256 of each worker's phone number.
// These MUST match exactly what was seeded into the PostgreSQL database.
// Worker phone numbers: Ravi="9876543210", Priya="8765432109", Arjun="7654321098"

export const workers = [
  {
    name: 'Ravi (Full-time)',
    city: 'Bangalore',
    zone: '560034',
    hash: '7619ee8cea49187f309616e30ecf54be072259b43760f1f550a644945d5572f2'
  },
  {
    name: 'Priya (Regular)',
    city: 'Mumbai',
    zone: '400053',
    hash: '6a761fe7202f0278928af483413205dee118492f56c166d7b2692eb08a52c2d2'
  },
  {
    name: 'Arjun (Casual)',
    city: 'Delhi',
    zone: '110001',
    hash: '116a28a7f48aa21cb4bc20084d07e3d184bdf1d742a01633c165d301dce9f755'
  }
]
