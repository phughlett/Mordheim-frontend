

export function StatsTable() {

  return (
    <div className="rounded-lg p-4">
      <table className=" border-collapse">
        <thead>
          <tr className="">
            <th className="px-2 py-1 border text-center">M</th>
            <th className="px-2 py-1 border text-center">WS</th>
            <th className="px-2 py-1 border text-center">BS</th>
            <th className="px-2 py-1 border text-center">S</th>
            <th className="px-2 py-1 border text-center">T</th>
            <th className="px-2 py-1 border text-center">W</th>
            <th className="px-2 py-1 border text-center">I</th>
            <th className="px-2 py-1 border text-center">A</th>
            <th className="px-2 py-1 border text-center">Ld</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-2 py-1 border text-center">0</td>
            <td className="px-2 py-1 border text-center">0</td>
            <td className="px-2 py-1 border text-center">0</td>
            <td className="px-2 py-1 border text-center">0</td>
            <td className="px-2 py-1 border text-center">0</td>
            <td className="px-2 py-1 border text-center">0</td>
            <td className="px-2 py-1 border text-center">0</td>
            <td className="px-2 py-1 border text-center">0</td>
            <td className="px-2 py-1 border text-center">0</td>

          </tr>
        </tbody>
      </table>
    </div>
  )
}