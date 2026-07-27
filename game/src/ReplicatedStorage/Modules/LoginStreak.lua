-- LoginStreak.lua
-- Pure date/streak rules used by the persistent economy profile.

local LoginStreak = {}

local function parseDate(value)
	if type(value) ~= "string" then return nil end
	local year, month, day = value:match("^(%d%d%d%d)%-(%d%d)%-(%d%d)$")
	year, month, day = tonumber(year), tonumber(month), tonumber(day)
	if not year or not month or not day or month < 1 or month > 12 or day < 1 or day > 31 then
		return nil
	end
	return year, month, day
end

-- Gregorian civil-date ordinal. This avoids local-time/DST errors around the
-- daylight-saving transition when comparing YYYY-MM-DD login dates.
local function daysFromCivil(year, month, day)
	year = year - (month <= 2 and 1 or 0)
	local era = math.floor(year / 400)
	local yearOfEra = year - era * 400
	local adjustedMonth = month + (month > 2 and -3 or 9)
	local dayOfYear = math.floor((153 * adjustedMonth + 2) / 5) + day - 1
	local dayOfEra = yearOfEra * 365 + math.floor(yearOfEra / 4)
		- math.floor(yearOfEra / 100) + dayOfYear
	return era * 146097 + dayOfEra
end

function LoginStreak.DaysBetween(firstDate, secondDate)
	local y1, m1, d1 = parseDate(firstDate)
	local y2, m2, d2 = parseDate(secondDate)
	if not y1 or not y2 then return nil end
	return daysFromCivil(y2, m2, d2) - daysFromCivil(y1, m1, d1)
end

function LoginStreak.Update(currentStreak, lastDate, today)
	local streak = tonumber(currentStreak) or 0
	streak = math.max(0, math.floor(streak))
	if type(today) ~= "string" or not parseDate(today) then
		return streak, lastDate
	end
	if not parseDate(lastDate) then
		return 1, today
	end

	local gap = LoginStreak.DaysBetween(lastDate, today)
	if gap == 1 then
		return streak + 1, today
	elseif gap == 0 then
		return streak, today
	end
	return 1, today
end

return LoginStreak
