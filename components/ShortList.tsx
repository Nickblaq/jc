
'use client';
import { ShortItem } from '@/types'


export default function ShortList({ shorts }: { shorts: ShortItem[] }) {
  return (
    <div className="grid gap-4">
      {shorts.map((short) => (
      <div>
          <div className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50">
            <img src={short.thumbnail} alt={short.title} className="w-40 h-72 object-cover rounded" />
            <div>
              <h2 className="font-semibold">{short.title}</h2>
              <p>Duration: {short?.duration}</p>
              <p>Views: {short.views}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
