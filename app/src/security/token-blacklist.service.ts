import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class TokenBlacklistService {
  private readonly BLACKLIST_PREFIX = 'blacklist:';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Add a token to the blacklist with expiration time
   * @param token JWT token to blacklist
   * @param expiresIn TTL in seconds (token expiration time)
   */
  async addToBlacklist(token: string, expiresIn: number): Promise<void> {
    const key = this.BLACKLIST_PREFIX + token;
    // Set the token in cache with TTL equal to token expiration
    // Using a placeholder value since we only care about key existence
    await this.cacheManager.set(key, '1', expiresIn * 1000); // Convert seconds to milliseconds
  }

  /**
   * Check if a token is blacklisted
   * @param token JWT token to check
   * @returns true if token is blacklisted, false otherwise
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const key = this.BLACKLIST_PREFIX + token;
    const result = await this.cacheManager.get(key);
    return result !== null && result !== undefined;
  }
}
