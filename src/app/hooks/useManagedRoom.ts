import { useAuth } from '../context/AuthContext';
import { Room, roomManagerIds } from '../services/templateService';

/**
 * The room a Cinema Room Manager view is scoped to.
 *
 * A real manager always gets a room they are assigned to. An Admin viewing as a
 * manager is assigned to nothing, so they get whichever room they picked in the
 * sidebar (see `viewRoomId`), falling back to the first room in the list.
 */
export const useManagedRoom = (rooms: Room[]): Room | null => {
  const { uid, actualRole, viewRoomId } = useAuth();

  if (actualRole === 'Admin') {
    return rooms.find(r => r.id === viewRoomId) ?? rooms[0] ?? null;
  }
  return rooms.find(r => uid && roomManagerIds(r).includes(uid)) ?? rooms[0] ?? null;
};
