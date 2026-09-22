local seen = redis.call('TYPE', KEYS[1]).ok
local weekly = redis.call('TYPE', KEYS[2]).ok
local monthly = redis.call('TYPE', KEYS[3]).ok
if (seen ~= 'none' and seen ~= 'set') or (weekly ~= 'none' and weekly ~= 'zset') or (monthly ~= 'none' and monthly ~= 'zset') then
    return redis.error_reply('Unexpected leaderboard key type')
end
if redis.call('SISMEMBER', KEYS[1], ARGV[1]) == 1 then return 0 end
redis.call('ZINCRBY', KEYS[2], ARGV[2], ARGV[3])
redis.call('ZINCRBY', KEYS[3], ARGV[2], ARGV[3])
redis.call('SADD', KEYS[1], ARGV[1])
return 1
