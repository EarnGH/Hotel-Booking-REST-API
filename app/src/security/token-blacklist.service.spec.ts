import { Test, TestingModule } from '@nestjs/testing';
import { TokenBlacklistService } from './token-blacklist.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let cacheManager: any;

  const mockCacheManager = {
    set: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
    cacheManager = module.get(CACHE_MANAGER);

    jest.clearAllMocks();
  });

  describe('addToBlacklist', () => {
    it('should add token to cache blacklist with TTL in milliseconds', async () => {
      const token = 'test_token_12345';
      const expiresIn = 3600; // 1 hour in seconds

      mockCacheManager.set.mockResolvedValueOnce(undefined);

      await service.addToBlacklist(token, expiresIn);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'blacklist:' + token,
        '1',
        3600 * 1000, // Should convert to milliseconds
      );
    });

    it('should handle different expiration times', async () => {
      const token = 'refresh_token_xyz';
      const expiresIn = 604800; // 7 days in seconds

      mockCacheManager.set.mockResolvedValueOnce(undefined);

      await service.addToBlacklist(token, expiresIn);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'blacklist:' + token,
        '1',
        604800 * 1000, // 7 days in milliseconds
      );
    });
  });

  describe('isBlacklisted', () => {
    it('should return true if token is blacklisted', async () => {
      const token = 'blacklisted_token';

      mockCacheManager.get.mockResolvedValueOnce('1');

      const result = await service.isBlacklisted(token);

      expect(result).toBe(true);
      expect(cacheManager.get).toHaveBeenCalledWith('blacklist:' + token);
    });

    it('should return false if token is not blacklisted', async () => {
      const token = 'valid_token';

      mockCacheManager.get.mockResolvedValueOnce(null);

      const result = await service.isBlacklisted(token);

      expect(result).toBe(false);
      expect(cacheManager.get).toHaveBeenCalledWith('blacklist:' + token);
    });

    it('should return false if token lookup returns undefined', async () => {
      const token = 'valid_token_2';

      mockCacheManager.get.mockResolvedValueOnce(undefined);

      const result = await service.isBlacklisted(token);

      expect(result).toBe(false);
      expect(cacheManager.get).toHaveBeenCalledWith('blacklist:' + token);
    });

    it('should check multiple different tokens independently', async () => {
      const token1 = 'token_1';
      const token2 = 'token_2';

      mockCacheManager.get.mockResolvedValueOnce('1'); // token1 is blacklisted
      mockCacheManager.get.mockResolvedValueOnce(null); // token2 is not blacklisted

      const result1 = await service.isBlacklisted(token1);
      const result2 = await service.isBlacklisted(token2);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(cacheManager.get).toHaveBeenCalledTimes(2);
    });
  });
});
