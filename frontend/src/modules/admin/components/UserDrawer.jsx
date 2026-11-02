import { SlideOver } from '@/components/ui'
import UserPanel from './UserPanel'

/** The user panel in a right-side slide-over, for lists outside the KYC workspace. */
export default function UserDrawer({ userId, onClose, onChanged }) {
  return (
    <SlideOver open={Boolean(userId)} onClose={onClose} label="User details">
      <UserPanel userId={userId} onClose={onClose} onChanged={onChanged} />
    </SlideOver>
  )
}
