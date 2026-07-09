if (!self.define) {
  let i,
    e = {}
  const s = (s, a) => (
    (s = new URL(s + '.js', a).href),
    e[s] ||
      new Promise((e) => {
        if ('document' in self) {
          const i = document.createElement('script')
          ;((i.src = s), (i.onload = e), document.head.appendChild(i))
        } else ((i = s), importScripts(s), e())
      }).then(() => {
        let i = e[s]
        if (!i) throw new Error(`Module ${s} didn’t register its module`)
        return i
      })
  )
  self.define = (a, t) => {
    const n = i || ('document' in self ? document.currentScript.src : '') || location.href
    if (e[n]) return
    let c = {}
    const r = (i) => s(i, n),
      p = { module: { uri: n }, exports: c, require: r }
    e[n] = Promise.all(a.map((i) => p[i] || r(i))).then((i) => (t(...i), c))
  }
}
define(['./workbox-860c9203'], function (i) {
  'use strict'
  ;(importScripts('fallback-eiRxhI4q7amziQi1t5mpg.js', 'worker-eiRxhI4q7amziQi1t5mpg.js'),
    self.skipWaiting(),
    i.clientsClaim(),
    i.precacheAndRoute(
      [
        { url: '/_next/app-build-manifest.json', revision: '604061dbd59dd8bfcf5013b5a8228d19' },
        { url: '/_next/static/chunks/1095-35ae76091d4b5bc6.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/141-b015fb0fcf711d21.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/1801-587b66d3523de998.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/1870-2806bfcee6121dda.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/1886-72d490eebdf6ac2d.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/1913-4c5278360b88fbdb.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/1990-9d77b0dbda33964e.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/1991-848d13b1ec325603.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/1ed6fd24.f2ab1fd808ff7620.js', revision: 'f2ab1fd808ff7620' },
        { url: '/_next/static/chunks/2123-7b2c582a92ad09dd.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/2364-b64968357e94fec5.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/2841-9ade8b7505ca5941.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/3072-cd70274be081e90c.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/3262-879d79eb152ae04e.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/3312.ffa6e7e38c80bd95.js', revision: 'ffa6e7e38c80bd95' },
        { url: '/_next/static/chunks/363-10a1a75e309e4b92.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/394-7ddb5271052bf015.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/4116-acd467fe03d9503e.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        {
          url: '/_next/static/chunks/432fac1e-1233afb5e7561c91.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        { url: '/_next/static/chunks/4506-ff032b544b9f0179.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/4542-b346b3ef1ee21e0e.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/4824.4212158f470bdacf.js', revision: '4212158f470bdacf' },
        { url: '/_next/static/chunks/4871-c687dd61ee0168ce.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/4956.4e345aee6426a057.js', revision: '4e345aee6426a057' },
        { url: '/_next/static/chunks/5013-5e455bab12206f82.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/5067-995297e7d66346ef.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/5300.ba07eac89af0be32.js', revision: 'ba07eac89af0be32' },
        { url: '/_next/static/chunks/5323-1de4e21480193693.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/548-c3ac66dad54203db.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/5481.5ac0ab84eb4b7f15.js', revision: '5ac0ab84eb4b7f15' },
        { url: '/_next/static/chunks/5928-ce3f2f7d9a127705.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/5950-3e44dc776ff6273a.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/5957-4e8091dc4d7b6ebc.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/6028-59deedf9691c1855.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/6152-f5e7e689e7e81ccd.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        {
          url: '/_next/static/chunks/618f8807-6382879e27f49d3c.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        { url: '/_next/static/chunks/6312-006628ff8783e170.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/6396-94dfd3099b3b3f5b.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/6568-b1894bdfb58426ce.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/6846.8a62138d72f13af7.js', revision: '8a62138d72f13af7' },
        { url: '/_next/static/chunks/703-916661a482902600.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/7056-9d432bb059c6e192.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/7065-ff03e889feb15880.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/7434-94376a65711a8203.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/761-adcca67ea48bc3a0.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/7670-ced6cd31a292a8d6.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/7690.43d54ac8ec36e880.js', revision: '43d54ac8ec36e880' },
        { url: '/_next/static/chunks/7773-900d4e6d9a6ef622.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/7994.0633673bce964672.js', revision: '0633673bce964672' },
        { url: '/_next/static/chunks/8269-2aaa22152c5984e5.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/8323-6abaa3d1e7bf9d3c.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/8598.c55786b6019f87a4.js', revision: 'c55786b6019f87a4' },
        { url: '/_next/static/chunks/8919-be9b55c3f091f122.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/90d2c0df.12c80b983297d3ce.js', revision: '12c80b983297d3ce' },
        { url: '/_next/static/chunks/9159-909b11fa30581713.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/9260-bf25d909f3b99d3e.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/9291-661cea96f69a2404.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/9445-15c4a21d5966688b.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/945-02647473e3cab5dc.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/_next/static/chunks/9989-0fb4a9463391d22d.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        {
          url: '/_next/static/chunks/a5f9773b-0ac7b43e65882485.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/analytics-dashboard/page-f4ff434455192758.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/analytics/page-3a269a3dbe6dc2ea.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/community/page-ec6117b5ca7b50dd.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/compare/page-27f4fdc153204800.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/dashboard/loading-415a315fe5dfe987.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/dashboard/page-6f05decb44d971a2.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/debug-freighter/page-0547fa787b4f7ac9.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/groups/%5Bid%5D/dashboard/page-1e22def99bc6dc33.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/groups/%5Bid%5D/page-a9e9128aec66df07.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/groups/create/page-d08be4f83641373b.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/groups/loading-454753a504a0f997.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/groups/page-16e5cf1e9e049fe5.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/help/page-90ef2514045cd278.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/insurance/page-93365547a175f2b9.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/invite/%5Bcode%5D/page-e1e22f14d7fb3e57.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/layout-3d1046ce00f3af52.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/leaderboard/page-1d71ee625f4b37d0.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/notifications/page-403d22b2b87dca61.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/offline/page-dabc892353baafc1.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/page-0d4570015621c473.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/page-1444fe76142b77d6.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/settings/notifications/page-97727db3b3b5f4d8.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/templates/page-89992a546ca3f610.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/%5Blocale%5D/test-wallet/page-1304d5b117aabaf3.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-95115315ee128ca9.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/admin/analytics/page-b70d877593acbe15.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/admin/audit/page-543245f99d36515d.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/admin/layout-b56236d3528e745e.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/admin/page-4c48bf07379034f9.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/admin/settings/page-17caf4b35016b219.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/admin/users/page-345e819fdc2b6c84.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/analytics/loading-3927e7b48f5148f3.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/analytics/page-ade5e6663fd5c4b5.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/calculator/page-d8472c7d1307eb04.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/compare/page-5e0d0358e4dfc08c.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/dashboard/charts/page-61112d9835cfee73.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/dashboard/customize/page-7674bb10ada7b735.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/dashboard/loading-efddedc502975cab.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/dashboard/page-4d2dcdd4e2d9db49.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/debug-freighter/page-3e9b86d1e09676a4.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/debug-lobstr/page-8612d89ba82f7f96.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/discover/page-002885241203e874.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/discovery/page-e122c36b68d179a0.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/emergency/page-b3e5558bf275c032.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/error-2b58e4696810e7b9.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/goals/page-852d952bdbb65edf.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/page-da7f90be6e7c61a8.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/settings/page-c2d7674add31b311.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/groups/loading-ccb1a59a5719273c.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/groups/page-caa8270f9c924664.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/help/page-3c15d38da485dc0e.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/invitations/page-eadcb3b4f28789d9.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/layout-83841a223dd81da5.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/leaderboard/loading-6b2bbc4a1ba27abf.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/leaderboard/page-ec91c317f9220987.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/loading-7be47a0a821d8a96.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/loans/page-d3e8373409faf2ac.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/map/page-f409483282f63fef.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/members/%5Bid%5D/page-5eb1110b71974fb3.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/not-found-ea4d8b36bdb912e8.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/offline/page-611585b0ea09e4d1.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/page-b6cc5afa14e6b76b.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/profile/loading-076f628560f14124.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/profile/page-bc1da0d3de70569d.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/test-wallet-modal/page-d3dd6d73c6fbae29.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/transactions/loading-976756a809c5bebd.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/app/transactions/page-3f6db8785676b347.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/c75e29e3-b186f2cca92d1ce9.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/e646c3ff-ace7d6bcea9d8113.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/framework-a117d81bf1b91f9a.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        { url: '/_next/static/chunks/main-0fe8f5d0c4f1cd1a.js', revision: 'eiRxhI4q7amziQi1t5mpg' },
        {
          url: '/_next/static/chunks/main-app-2b5119cc808094bb.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/pages/_app-6e77c796599b9f73.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/pages/_error-bede3a8288930dcf.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-d81b2682f97eefff.js',
          revision: 'eiRxhI4q7amziQi1t5mpg',
        },
        { url: '/_next/static/css/02d931df86c7edfd.css', revision: '02d931df86c7edfd' },
        { url: '/_next/static/css/3ca4ce7e689c8728.css', revision: '3ca4ce7e689c8728' },
        { url: '/_next/static/css/7cca8e2c5137bd71.css', revision: '7cca8e2c5137bd71' },
        { url: '/_next/static/css/e9f989f02c269104.css', revision: 'e9f989f02c269104' },
        {
          url: '/_next/static/eiRxhI4q7amziQi1t5mpg/_buildManifest.js',
          revision: 'd703d016a59d24e88157f7d746c032c7',
        },
        {
          url: '/_next/static/eiRxhI4q7amziQi1t5mpg/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        {
          url: '/_next/static/media/19cfc7226ec3afaa-s.woff2',
          revision: '9dda5cfc9a46f256d0e131bb535e46f8',
        },
        {
          url: '/_next/static/media/21350d82a1f187e9-s.woff2',
          revision: '4e2553027f1d60eff32898367dd4d541',
        },
        {
          url: '/_next/static/media/8e9860b6e62d6359-s.woff2',
          revision: '01ba6c2a184b8cba08b0d57167664d75',
        },
        {
          url: '/_next/static/media/ba9851c3c22cd980-s.woff2',
          revision: '9e494903d6b0ffec1a1e14d34427d44d',
        },
        {
          url: '/_next/static/media/c5fe6dc8356a8c31-s.woff2',
          revision: '027a89e9ab733a145db70f09b8a18b42',
        },
        {
          url: '/_next/static/media/df0a9ae256c0569c-s.woff2',
          revision: 'd54db44de5ccb18886ece2fda72bdfe0',
        },
        {
          url: '/_next/static/media/e4af272ccee01ff0-s.p.woff2',
          revision: '65850a373e258f1c897a2b3d75eb74de',
        },
        { url: '/animations/error.json', revision: '636844765c167696373b996d02237fc7' },
        { url: '/animations/success.json', revision: '3015db39e8fdc4dcf6e5911036586327' },
        { url: '/apple-touch-icon.png', revision: '90b1618ea5779be4bee79d6327cfe507' },
        {
          url: '/design/micro-interactions/animation.pdf',
          revision: '551f01aea586142967cde85720770495',
        },
        { url: '/favicon.ico', revision: 'bbcba73600de8d0f22fb6de13dfc3075' },
        { url: '/icon-192.png', revision: 'cc4d9849a066654efa420b525de7a6e4' },
        { url: '/icon-512.png', revision: '2b6e7d8af03fa5c52da42240ad335fa7' },
        { url: '/illustrations/no-groups.svg', revision: '129fd6baa9a20b341a2fbb94227ffef2' },
        { url: '/illustrations/no-members.svg', revision: '7313222784bcd7aa0fd547ad74690f7c' },
        {
          url: '/illustrations/no-notifications.svg',
          revision: 'a83c9fcd00bcf6a1c5b64ce728497375',
        },
        { url: '/illustrations/no-transactions.svg', revision: '0ddd6616582ecbf950299239175cae77' },
        { url: '/logo-icon.svg', revision: '7fb9a3a392e55b8a8b0ade59f76dd5c8' },
        { url: '/logo-light.svg', revision: 'dc69aa1fefce96811192e4ff9ff4d197' },
        { url: '/logo.svg', revision: '4c7276f300bf4ba58e23dd42622c9203' },
        { url: '/manifest.json', revision: '4c38d57f19767907eab23a8fb31c0fab' },
        { url: '/offline', revision: 'eiRxhI4q7amziQi1t5mpg' },
        { url: '/og-image.png', revision: '10395d0cab60f9460500acc7896208fd' },
        { url: '/patterns/dots.svg', revision: '81dabf87068a33d6b6bd07ec5c15b4b6' },
        { url: '/patterns/grid.svg', revision: '56f58b190bdf2ced3472f4f4d4c4dc39' },
        { url: '/patterns/mesh.svg', revision: '39001e18b4b23e37e6f90ccdb0ed06d4' },
        { url: '/patterns/waves.svg', revision: '53fea8278471961c48c187706ead399d' },
      ],
      { ignoreURLParametersMatching: [] }
    ),
    i.cleanupOutdatedCaches(),
    i.registerRoute(
      '/',
      new i.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({ request: i, response: e, event: s, state: a }) =>
              e && 'opaqueredirect' === e.type
                ? new Response(e.body, { status: 200, statusText: 'OK', headers: e.headers })
                : e,
          },
          { handlerDidError: async ({ request: i }) => self.fallback(i) },
        ],
      }),
      'GET'
    ),
    i.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new i.CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [
          new i.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
          { handlerDidError: async ({ request: i }) => self.fallback(i) },
        ],
      }),
      'GET'
    ),
    i.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new i.StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [
          new i.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
          { handlerDidError: async ({ request: i }) => self.fallback(i) },
        ],
      }),
      'GET'
    ),
    i.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new i.StaleWhileRevalidate({
        cacheName: 'static-font-assets',
        plugins: [
          new i.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
          { handlerDidError: async ({ request: i }) => self.fallback(i) },
        ],
      }),
      'GET'
    ),
    i.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new i.StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        plugins: [
          new i.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
          { handlerDidError: async ({ request: i }) => self.fallback(i) },
        ],
      }),
      'GET'
    ),
    i.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new i.StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [
          new i.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
          { handlerDidError: async ({ request: i }) => self.fallback(i) },
        ],
      }),
      'GET'
    ),
    i.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new i.CacheFirst({
        cacheName: 'static-audio-assets',
        plugins: [
          new i.RangeRequestsPlugin(),
          new i.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          { handlerDidError: async ({ request: i }) => self.fallback(i) },
        ],
      }),
      'GET'
    ),
    i.registerRoute(
      /\.(?:mp4)$/i,
      new i.CacheFirst({
        cacheName: 'static-video-assets',
        plugins: [
          new i.RangeRequestsPlugin(),
          new i.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          { handlerDidError: async ({ request: i }) => self.fallback(i) },
        ],
      }),
      'GET'
    ),
    i.registerRoute(
      /\.(?:js)$/i,
      new i.StaleWhileRevalidate({
        cacheName: 'static-js-assets',
        plugins: [
          new i.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          { handlerDidError: async ({ request: i }) => self.fallback(i) },
        ],
      }),
      'GET'
    ),
    i.registerRoute(
      /\.(?:css|less)$/i,
      new i.StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        plugins: [
          new i.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          { handlerDidError: async ({ request: i }) => self.fallback(i) },
        ],
      }),
      'GET'
    ),
    i.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new i.StaleWhileRevalidate({
        cacheName: 'next-data',
        plugins: [
          new i.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          { handlerDidError: async ({ request: i }) => self.fallback(i) },
        ],
      }),
      'GET'
    ),
    i.registerRoute(
      /\/api\/.*$/i,
      new i.NetworkFirst({
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        plugins: [
          new i.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 300 }),
          { handlerDidError: async ({ request: i }) => self.fallback(i) },
        ],
      }),
      'GET'
    ),
    i.registerRoute(
      /.*/i,
      new i.NetworkFirst({
        cacheName: 'others',
        networkTimeoutSeconds: 10,
        plugins: [
          new i.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          { handlerDidError: async ({ request: i }) => self.fallback(i) },
        ],
      }),
      'GET'
    ))
})
