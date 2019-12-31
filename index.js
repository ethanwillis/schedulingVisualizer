const fedHolidays = require("@18f/us-federal-holidays")
const isAHoliday = fedHolidays.isAHoliday;
const endOfYear = require("date-fns/endOfYear");
const eachDayOfInterval = require("date-fns/eachDayOfInterval");
const min = require("date-fns/min");
const max = require("date-fns/max");
const isSameDay = require("date-fns/isSameDay");
const isSameMonth = require("date-fns/isSameMonth");
const isSameYear = require("date-fns/isSameYear");
const differenceInCalendarDays = require('date-fns/differenceInCalendarDays')
const format = require('date-fns/format');
const compareAsc = require('date-fns/compareAsc');
const chalk = require("chalk");
const process = require('process');

const resetTerminalCursor = () => {
  process.stdout.write("\033[1;1H");
};

const clearScreen = () => {
  process.stdout.write("\033[2J")
  process.stdout.write("\033[2;1H");
};

const areDatesEqual = (date1, date2) => {
  return isSameDay(date1, date2) && isSameMonth(date1, date2) && isSameYear(date1, date2);
}

const isDateInList = (date, dateList) => {
  for(i = 0; i < dateList.length; i++) {
    if(areDatesEqual(date, dateList[i])) {
      return true;
    }
  }
  return false;
}

const intervalForYear = year => {
  return {
    startDate: new Date(year, 0, 1),
    endDate: new Date(year, 11, 31)
  }
}
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const randomDateInterval = (start, end) => {
  const startDate = randomDate(start, end)
  const endDate = randomDate(startDate, end)
  return {
    startDate: startDate,
    endDate: endDate
  }
}

const generateStats = schedule => {
  let stats = {
    averageDaysBetweenDates: -1,
    maxDaysBetweenDates: -1,
    minDaysBetweenDates: -1
  }

  stats.averageDaysBetweenDates = differenceInCalendarDays(schedule.endDate, schedule.startDate) / schedule.scheduledDates.length;


  schedule.scheduledDates = schedule.scheduledDates.sort(compareAsc);
  for(i = 0; i < schedule.scheduledDates.length - 1; i++) {
    const difference = differenceInCalendarDays(
                        schedule.scheduledDates[i+1],
                        schedule.scheduledDates[i]
                       )
    if(i == 0) {
      stats.minDaysBetweenDates = difference
      stats.maxDaysBetweenDates = difference
    } else {
      if(stats.minDaysBetweenDates > difference) {
        stats.minDaysBetweenDates = difference;
      }

      if(stats.maxDaysBetweenDates < difference) {
        stats.maxDaysBetweenDates = difference;
      }
    }
  }
  return stats;
}

/**
  Params:
    year, Integer: The year to generate dates for
    schedule, [Date]: An array of dates that you want to schedule
    checkIfDateIsAcceptable, Function: A function that determines
      whether a day is available for scheduling or not.

  Blue Days - Unscheduled Acceptable days
  Red Days - Unscheduled Unacceptable days
  Green Days - Scheduled Acceptable days
  Yellow Days - Scheduled Unacceptable days

  Returns an array of colored lines that can be used to visualize
  what a schedule looks like
*/
const generateOutputForYear = (year, schedule, checkIfDateIsAcceptable) => {
  const {startDate, endDate} = intervalForYear(year);
  const datesInYear = eachDayOfInterval({start: startDate, end: endDate})
  const scheduleStartDate = schedule.startDate;
  const scheduleEndDate = schedule.endDate;

  return datesInYear.map( date => {
    let coloredDay = "";
    const isScheduledDay = isDateInList(date, schedule.scheduledDates);

    if(checkIfDateIsAcceptable(date)) {
      if(isScheduledDay) {
        coloredDay += chalk.green('|')
      } else {
        coloredDay += chalk.blue('|')
      }
    } else {
      if(isScheduledDay) {
        coloredDay += chalk.yellow('|')
      } else {
        coloredDay += chalk.red('|')
      }
    }

    if(areDatesEqual(date, scheduleStartDate)) {
      coloredDay = chalk.magentaBright('[') + coloredDay
    } else if(areDatesEqual(date, scheduleEndDate)) {
      coloredDay = coloredDay + chalk.magentaBright(']')
    }
    return coloredDay;
  })
};

/**
  Prints out a visualization of applying your scheduler and
  checkIfDateIsAcceptable functions to one or more calendar years.


  Params:
    years, [Integer]: An array of years that you want to visualize.
    scheduler, Function: A function that will generate a schedule
    checkIfDateIsAcceptable, Function: A function that determines
      whether a day is available for scheduling or not.
*/
const displayVisualizations = (years, scheduler, checkIfDateIsAcceptable, timeoutPerIteration) => {
  const visualizations = years.map((year, index) => {
    return new Promise((resolve, reject) =>
      setTimeout(
        () => {
          clearScreen();
          const schedule = scheduler(year);
          const stats = generateStats(schedule);

          const infoOutput = `Iteration ${chalk.yellow(index+1)} of ${chalk.yellow(years.length)} -- ${schedule.scheduledDates.length} Scheduled Days on [${format(schedule.startDate, "yyyy-MM-dd")}, ${format(schedule.endDate, "yyyy-MM-dd")}]`
          const visualizationOutput = `${generateOutputForYear(
                                          year,
                                          schedule,
                                          checkIfDateIsAcceptable).join("")
                                        }`
          const statsOutput = `Scheduled Day Statistics:\n\t Avg. Between Dates:\t ${stats.averageDaysBetweenDates}\n\t Min. Days Between Dates: ${stats.minDaysBetweenDates}\n\t Max Days Between Dates: ${stats.maxDaysBetweenDates}`

          process.stdout.write(visualizationOutput + "\n" + infoOutput + "\n\n" + statsOutput);

          resolve();
        },
        timeoutPerIteration * index
      )
    )
  });

  Promise.all(visualizations).then( () => {resetTerminalCursor();} );
};

const years = [2020, 2021, 2022, 2023, 2024]
const timeoutPerIteration = 1500;
/*
  Return true if a date should be open for scheduling.
  Return false if a date should not be open for scheduling.
*/
const checkIfDateIsAcceptable = date => {
  if(isAHoliday(date)) {
    return false;
  } else {
    return true;
  }
}
/**
  Return [Date] for each day in the year that you want to schedule.
*/
const scheduler = year => {
  // Generate random interval
  const { startDate, endDate } = intervalForYear(year);
  const interval = randomDateInterval(startDate, endDate);
  const daysInInterval = differenceInCalendarDays(interval.endDate, interval.startDate)
  const numberOfScheduledDates = Math.floor(Math.random() * daysInInterval) + 1;

  let randomSchedule = {
    startDate: interval.startDate,
    endDate: interval.endDate,
    scheduledDates: []
  };

  for(i = 0; i < numberOfScheduledDates; i++) {
    randomSchedule.scheduledDates.push(randomDate(interval.startDate, interval.endDate));
  }

  return randomSchedule;
}

displayVisualizations(years, scheduler, checkIfDateIsAcceptable, timeoutPerIteration);
