import {
  getCenterMembers,
  getUserCenters,
  getMyCenters,
  addCenterMember,
  removeCenterMember,
  updateCenterMemberRole,
} from '../../../api/centerMemberApi';
import axiosInstance from '../../../api/axiosInstance';

jest.mock('../../../api/axiosInstance');

const mockAxios = axiosInstance as jest.Mocked<typeof axiosInstance>;

describe('centerMemberApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCenterMembers', () => {
    it('should fetch center members from primary endpoint', async () => {
      const mockMembers = [
        { _id: 'member-1', user_id: 'user-1', center_id: 'center-123' },
        { _id: 'member-2', user_id: 'user-2', center_id: 'center-123' },
      ];
      mockAxios.get.mockResolvedValue({ data: mockMembers });

      const result = await getCenterMembers('center-123');

      expect(mockAxios.get).toHaveBeenCalledWith('/centerMember/center-123/members');
      expect(result).toEqual(mockMembers);
    });

    it('should fallback to alternative endpoint if primary fails', async () => {
      const mockMembers = [{ _id: 'member-1', user_id: 'user-1' }];
      mockAxios.get
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({ data: mockMembers });

      const result = await getCenterMembers('center-456');

      expect(mockAxios.get).toHaveBeenCalledWith('/centerMember/center-456/members');
      expect(mockAxios.get).toHaveBeenCalledWith('/centerMember/center/center-456');
      expect(result).toEqual(mockMembers);
    });

    it('should handle errors from both endpoints', async () => {
      mockAxios.get.mockRejectedValue(new Error('Center not found'));

      await expect(getCenterMembers('invalid-center')).rejects.toThrow('Center not found');
    });
  });

  describe('getUserCenters', () => {
    it('should fetch centers for specific user', async () => {
      const mockCenters = [
        { center_id: 'center-1', user_id: 'user-123' },
        { center_id: 'center-2', user_id: 'user-123' },
      ];
      mockAxios.get.mockResolvedValue({ data: mockCenters });

      const result = await getUserCenters('user-123');

      expect(mockAxios.get).toHaveBeenCalledWith('/centerMember/user/user-123');
      expect(result).toEqual(mockCenters);
    });
  });

  describe('getMyCenters', () => {
    it('should fetch centers for current authenticated user', async () => {
      const mockMyCenters = [
        { center_id: 'center-1', role_in_center: 'admin' },
        { center_id: 'center-2', role_in_center: 'member' },
      ];
      mockAxios.get.mockResolvedValue({ data: mockMyCenters });

      const result = await getMyCenters();

      expect(mockAxios.get).toHaveBeenCalledWith('/CenterMember/my-centers');
      expect(result).toEqual(mockMyCenters);
    });
  });

  describe('addCenterMember', () => {
    it('should add member to center', async () => {
      const memberData = {
        center_id: 'center-789',
        user_id: 'user-456',
        role_in_center: 'member',
      };
      const mockResponse = { _id: 'member-new', ...memberData };
      mockAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await addCenterMember(memberData);

      expect(mockAxios.post).toHaveBeenCalledWith('/centerMember', memberData);
      expect(result).toEqual(mockResponse);
    });

    it('should add member without role specified', async () => {
      const memberData = {
        center_id: 'center-123',
        user_id: 'user-789',
      };
      mockAxios.post.mockResolvedValue({ data: { _id: 'member-id', ...memberData } });

      await addCenterMember(memberData);

      expect(mockAxios.post).toHaveBeenCalledWith('/centerMember', memberData);
    });
  });

  describe('removeCenterMember', () => {
    it('should remove member from center', async () => {
      const mockMembers = [
        { _id: 'mem-1', member_id: 'mem-1', user_id: 'user-remove', center_id: 'center-123' },
      ];
      mockAxios.get.mockResolvedValue({ data: mockMembers });
      mockAxios.delete.mockResolvedValue({ data: { success: true } });

      const result = await removeCenterMember('center-123', 'user-remove');

      expect(mockAxios.get).toHaveBeenCalledWith('/centerMember/center-123/members');
      expect(mockAxios.delete).toHaveBeenCalledWith('/centerMember/mem-1');
      expect(result).toEqual({ success: true });
    });

    it('should handle member with nested user_id object', async () => {
      const mockMembers = [
        {
          _id: 'mem-2',
          member_id: 'mem-2',
          user_id: { _id: 'user-nested', id: 'user-nested' },
          center_id: 'center-456',
        },
      ];
      mockAxios.get.mockResolvedValue({ data: mockMembers });
      mockAxios.delete.mockResolvedValue({ data: { success: true } });

      await removeCenterMember('center-456', 'user-nested');

      expect(mockAxios.delete).toHaveBeenCalledWith('/centerMember/mem-2');
    });

    it('should return success when member not found (404)', async () => {
      mockAxios.get.mockResolvedValue({ data: [] });

      const result = await removeCenterMember('center-789', 'user-notfound');

      expect(result.success).toBe(true);
    });

    it('should handle other errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Server error'));

      await expect(removeCenterMember('center-error', 'user-123')).rejects.toThrow(
        'Server error'
      );
    });
  });

  describe('updateCenterMemberRole', () => {
    it('should update member role', async () => {
      mockAxios.put.mockResolvedValue({
        data: { success: true, role_in_center: 'admin' },
      });

      const result = await updateCenterMemberRole('center-123', 'user-456', 'admin');

      expect(mockAxios.put).toHaveBeenCalledWith('/centerMember/center-123/user-456', {
        role_in_center: 'admin',
      });
      expect(result.success).toBe(true);
    });

    it('should update to different roles', async () => {
      mockAxios.put.mockResolvedValue({ data: { success: true } });

      await updateCenterMemberRole('center-789', 'user-123', 'moderator');

      expect(mockAxios.put).toHaveBeenCalledWith('/centerMember/center-789/user-123', {
        role_in_center: 'moderator',
      });
    });
  });
});
