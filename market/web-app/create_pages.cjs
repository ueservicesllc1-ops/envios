const fs = require('fs');
const path = require('path');
const pages = ['Home', 'Marketplace', 'ProductDetail', 'Cart', 'Checkout', 'Orders', 'SellerDashboard', 'LiveShopping', 'VibeFeed', 'Rewards', 'Referrals', 'Messages', 'NotFound'];
const dir = path.join(process.cwd(), 'src', 'pages');
fs.mkdirSync(dir, { recursive: true });
pages.forEach(p => fs.writeFileSync(path.join(dir, p + '.jsx'), `export default function ${p}() {\n  return <div className="p-4">${p} Page</div>;\n}`));
