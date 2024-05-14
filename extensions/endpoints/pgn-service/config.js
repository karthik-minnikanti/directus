module.exports = {
  allowedAccountTypes: {
    otp: {
      type: 'otp',
      table: 'pgn_otp'
    },
    wallet: {
      type: 'wallet',
      table: 'pgn_wallet'
    },
    sjifn: {
      type: 'sjifn',
      table: 'pgn_sjifn'
    }
  }
}