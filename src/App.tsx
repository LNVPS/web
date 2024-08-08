export default function App() {
  return (
    <div className="w-[700px] mx-auto m-2 p-2">
      <h1>lnvps.com</h1>

      <h1>VPS</h1>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-netrual-500 px-2 py-3">
          <h2>2x2x80</h2>
          <ul>
            <li>CPU: 2vCPU</li>
            <li>RAM: 2GB</li>
            <li>SSD: 80GB</li>
          </ul>
          <h2>3 EUR/mo</h2>
        </div>
        <div className="rounded-xl border border-netrual-500 px-2 py-3">
          <h2>4x4x160</h2>
          <ul>
            <li>CPU: 4vCPU</li>
            <li>RAM: 4GB</li>
            <li>SSD: 160GB</li>
          </ul>
          <h2>5 EUR/mo</h2>
        </div>
        <div className="rounded-xl border border-netrual-500 px-2 py-3">
          <h2>8x8x400</h2>
          <ul>
            <li>CPU: 8vCPU</li>
            <li>RAM: 8GB</li>
            <li>SSD: 400GB</li>
          </ul>
          <h2>12 EUR/mo</h2>
        </div>
      </div>
      <small>
        All VPS come with 1x IPv4 and 1x IPv6 address and unmetered traffic.
      </small>
    </div>
  )
}
