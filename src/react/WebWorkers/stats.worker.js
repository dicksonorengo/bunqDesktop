import addDays from "date-fns/addDays";
import addWeeks from "date-fns/addWeeks";
import addMonths from "date-fns/addMonths";
import addYears from "date-fns/addYears";
import subDays from "date-fns/subDays";
import subWeeks from "date-fns/subWeeks";
import subMonths from "date-fns/subMonths";
import subYears from "date-fns/subYears";
import getWeek from "date-fns/getISOWeek";
import getDayOfYear from "date-fns/getDayOfYear";
import format from "date-fns/format";

import CategoryHelper from "../Helpers/CategoryHelper";

import {
    bunqMeTabsFilter,
    masterCardActionFilter,
    paymentFilter,
    requestInquiryFilter,
    requestResponseFilter
} from "../Helpers/DataFilters";
import MonetaryAccount from "../Models/MonetaryAccount";

import Payment from "../Models/Payment";
import MasterCardAction from "../Models/MasterCardAction";
import RequestInquiry from "../Models/RequestInquiry";
import RequestResponse from "../Models/RequestResponse";
import BunqMeTab from "../Models/BunqMeTab";

const labelFormat = (date, type = "daily") => {
    switch (type) {
        case "yearly":
            return `year ${format(date, "YYYY")}`;
        case "monthly":
            return format(date, "MMM YYYY");
        case "weekly":
            return format(date, "WW/YYYY");
        case "daily":
        default:
            return format(date, "D MMM YY");
    }
};

const roundMoney = amount => {
    return Math.round(amount * 100) / 100;
};

const bunqMeTabMapper = (
    bunqMeTabs,
    bunqMeTabFilterSettings,
    categories,
    categoryConnections
) => {
    const data = [];
    bunqMeTabs
        .map(bunqmeTab => new BunqMeTab(bunqmeTab))
        .filter(bunqMeTabsFilter(bunqMeTabFilterSettings))
        .map(bunqMeTab => {
            data.push({
                date: bunqMeTab.created,
                change: 0,
                type: "bunqMeTab",
                categories: CategoryHelper(
                    categories,
                    categoryConnections,
                    "BunqMeTab",
                    bunqMeTab.id
                )
            });
        });
    return data;
};

const requestInquiryMapper = (
    requestInquiries,
    requestFilterSettings,
    categories,
    categoryConnections
) => {
    const data = [];
    requestInquiries
        .map(requestInquiry => new RequestInquiry(requestInquiry))
        .filter(requestInquiryFilter(requestFilterSettings))
        .map(requestInquiry => {
            data.push({
                date: requestInquiry.created,
                change: 0,
                type: "requestInquiry",
                categories: CategoryHelper(
                    categories,
                    categoryConnections,
                    "RequestInquiry",
                    requestInquiry.id
                )
            });
        });
    return data;
};

const requestResponseMapper = (
    requestResponses,
    requestFilterSettings,
    categories,
    categoryConnections
) => {
    const data = [];
    requestResponses
        .map(requestResponse => new RequestResponse(requestResponse))
        .filter(requestResponseFilter(requestFilterSettings))
        .map(requestResponse => {
            data.push({
                date: requestResponse.created,
                change: 0,
                type: "requestResponse",
                categories: CategoryHelper(
                    categories,
                    categoryConnections,
                    "RequestResponse",
                    requestResponse.id
                )
            });
        });
    return data;
};

const paymentMapper = (
    payments,
    paymentFilterSettings,
    categories,
    categoryConnections
) => {
    const data = [];
    payments
        .map(payment => new Payment(payment))
        .filter(paymentFilter(paymentFilterSettings))
        .map(payment => {
            data.push({
                date: payment.created,
                change: payment.getDelta(),
                type: "payment",
                categories: CategoryHelper(
                    categories,
                    categoryConnections,
                    "Payment",
                    payment.id
                )
            });
        });
    return data;
};

const masterCardActionMapper = (
    masterCardActions,
    paymentFilterSettings,
    categories,
    categoryConnections
) => {
    const data = [];
    masterCardActions
        .map(masterCardAction => new MasterCardAction(masterCardAction))
        .filter(masterCardActionFilter(paymentFilterSettings))
        .map(masterCardAction => {
            const validTypes = [
                "CLEARING_REFUND",
                "PRE_AUTHORISED",
                "PRE_AUTHORISATION_FINALISED",
                "ACQUIRER_AUTHORISED",
                "AUTHORISED",
                "AUTHORISED_PARTIAL",
                "STAND_IN_AUTHORISED",
                "UNAUTHORISED_CLEARING"
            ];

            if (validTypes.includes(masterCardAction.authorisation_status)) {
                let paymentSubType = "";

                switch (masterCardAction.label_card.type) {
                    case "MAESTRO":
                        paymentSubType = "maestroPayment";
                        break;
                    case "MASTERCARD":
                        paymentSubType = "masterCardPayment";
                        break;
                    case "MAESTRO_MOBILE_NFC":
                        paymentSubType =
                            masterCardAction.label_card.second_line.length > 0
                                ? "tapAndPayPayment"
                                : "applePayPayment";
                        break;
                }

                data.push({
                    date: masterCardAction.created,
                    change: masterCardAction.getDelta(),
                    type: "masterCardAction",
                    subType: paymentSubType,
                    categories: CategoryHelper(
                        categories,
                        categoryConnections,
                        "MasterCardAction",
                        masterCardAction.id
                    )
                });
            }
        });
    return data;
};

const formatLabels = (events, type) => {
    const dataCollection = {};

    // nothing to do with no events
    if (events.length <= 0) return dataCollection;

    // get newest item to check its date
    switch (type) {
        case "yearly":
            const startDateYearly = new Date();
            const endDateYearly = events[events.length - 1].date;
            const yearDifference1 =
                startDateYearly.getFullYear() - endDateYearly.getFullYear() + 1;

            for (let year = 0; year < yearDifference1; year++) {
                const startDate = subYears(new Date(), year);

                const label = labelFormat(startDate, type);
                dataCollection[label] = {
                    data: [],
                    date: startDate
                };
            }
            break;

        case "monthly":
            const startDateMonthly = new Date();
            const endDateMonthly = events[events.length - 1].date;
            const yearDifference2 =
                startDateMonthly.getFullYear() - endDateMonthly.getFullYear();

            // calculate difference in months between the two dates
            let monthDifference =
                startDateMonthly.getMonth() -
                endDateMonthly.getMonth() +
                1 +
                yearDifference2 * 12;

            // limit to 24 months
            monthDifference = monthDifference > 24 ? 24 : monthDifference;

            for (let month = 0; month < monthDifference; month++) {
                const startDate = subMonths(new Date(), month);

                const label = labelFormat(startDate, type);
                dataCollection[label] = {
                    data: [],
                    date: startDate
                };
            }
            break;

        case "weekly":
            const startDateWeekly = new Date();
            const endDateWeekly = events[events.length - 1].date;
            const yearDifference3 =
                startDateWeekly.getFullYear() - endDateWeekly.getFullYear();

            // calculate difference in weeks between the two dates
            let weekDifference =
                getWeek(startDateWeekly) -
                getWeek(endDateWeekly) +
                1 +
                yearDifference3 * 53;

            // limit to 53 weeks
            weekDifference = weekDifference > 53 ? 53 : weekDifference;

            for (let week = 0; week < weekDifference; week++) {
                const startDate = subWeeks(new Date(), week);

                const label = labelFormat(startDate, type);
                dataCollection[label] = {
                    data: [],
                    date: startDate
                };
            }
            break;

        case "daily":
            const startDateDayly = new Date();
            const endDateDayly = events[events.length - 1].date;
            const yearDifference4 =
                startDateDayly.getFullYear() - endDateDayly.getFullYear();

            // calculate the difference in days between the two dates
            let dayDifference =
                getDayOfYear(startDateDayly) -
                getDayOfYear(endDateDayly) +
                yearDifference4 * 365;

            // limit to 60 days
            dayDifference = dayDifference > 60 ? 60 : dayDifference;

            for (let day = 0; day < dayDifference; day++) {
                const startDate = subDays(new Date(), day);

                const label = labelFormat(startDate, type);
                dataCollection[label] = {
                    data: [],
                    date: startDate
                };
            }
            break;
    }
    return dataCollection;
};

const getData = (
    events,
    accounts,
    categories,
    selectedAccount,
    timeFrom = null,
    timeTo = new Date(),
    type = "daily"
) => {
    let accountInfo = false;
    accounts.map(account => {
        const accountObject = new MonetaryAccount(account);
        if (accountObject.id === selectedAccount || selectedAccount === false) {
            accountInfo = accountObject;
        }
    });
    let currentBalance = parseFloat(accountInfo.balance.value);

    // X axis labels
    let labelData = [];
    // balance across all days/weeks/months/years
    let balanceHistoryData = [];
    // total events history
    let eventCountHistory = [];
    // total category history
    let categoryCountHistory = {};
    // total category transaction history
    let categoryTransactionHistory = {};
    // individual count history
    let paymentCountHistory = [];
    let requestInquiryCountHistory = [];
    let requestResponseCountHistory = [];
    let bunqMeTabCountHistory = [];
    let masterCardActionCountHistory = [];
    let masterCardPaymentCountHistory = [];
    let tapAndPayPaymentCountHistory = [];
    let maestroPaymentCountHistory = [];
    let applePayPaymentCountHistory = [];

    // individual transaction history
    let paymentTransactionHistory = [];
    let requestInquiryTransactionHistory = [];
    let requestResponseTransactionHistory = [];
    let bunqMeTabTransactionHistory = [];
    let masterCardActionTransactionHistory = [];
    let masterCardPaymentTransactionHistory = [];
    let tapAndPayPaymentTransactionHistory = [];
    let maestroPaymentTransactionHistory = [];
    let applePayPaymentTransactionHistory = [];

    // sort all events by date first
    const sortedEvents = events.sort((a, b) => {
        return b.date - a.date;
    });

    // create the correct labels for the X axis
    const dataCollection = formatLabels(events, type);

    // combine the list
    sortedEvents.forEach(item => {
        const label = labelFormat(item.date, type);
        if (dataCollection[label]) {
            dataCollection[label].data.push(item);
        }
    });

    // only create this object once
    const categoryList = {};
    const categoryTransactionList = {};
    Object.keys(categories).forEach(categoryKey => {
        // used to sum data for each category
        categoryList[categoryKey] = 0;
        categoryTransactionList[categoryKey] = {
            sent: 0,
            received: 0,
            total: 0
        };

        // used to actually store the final total values
        categoryCountHistory[categoryKey] = [];
        categoryTransactionHistory[categoryKey] = {
            sent: [],
            received: [],
            total: []
        };
    });

    // loop through all the days
    Object.keys(dataCollection).map(label => {
        const dataItem = dataCollection[label];

        // temporary local variables to track amounts throughout the events for this X axis
        const categoryInfo = Object.assign({}, categoryList);
        const categoryTransactionInfo = {};
        // loop through them while making sure no references exist
        Object.keys(categoryTransactionList).forEach(
            key =>
                (categoryTransactionInfo[key] = Object.assign(
                    {},
                    categoryTransactionList[key]
                ))
        );

        const timescaleInfo = {
            masterCardAction: 0,
            requestResponse: 0,
            requestInquiry: 0,
            bunqMeTab: 0,
            payment: 0,

            masterCardPayment: 0,
            maestroPayment: 0,
            tapAndPayPayment: 0,
            applePayPayment: 0
        };
        const timescaleTransactionInfo = {
            masterCardAction: 0,
            requestResponse: 0,
            requestInquiry: 0,
            bunqMeTab: 0,
            payment: 0,

            masterCardPayment: 0,
            maestroPayment: 0,
            tapAndPayPayment: 0,
            applePayPayment: 0
        };

        let timescaleChange = 0;
        dataItem.data.map(item => {
            // increment this type to keep track of the different types
            timescaleInfo[item.type]++;
            // add the change to total
            timescaleTransactionInfo[item.type] += item.change;

            if (item.type === "masterCardAction") {
                timescaleInfo[item.subType]++;
                // add the subtype to total
                timescaleTransactionInfo[item.subType] += item.change;
            }

            // increment the category count for this timescale
            item.categories.forEach(category => {
                // category count increment
                categoryInfo[category.id]++;

                if (item.change > 0) {
                    // received money since change is positive
                    categoryTransactionInfo[category.id].received +=
                        item.change;
                }
                if (item.change < 0) {
                    // sent money since change is negative
                    categoryTransactionInfo[category.id].sent += item.change;
                }

                // always increase the total change
                categoryTransactionInfo[category.id].total += item.change;
            });

            // calculate change
            timescaleChange = timescaleChange + item.change;
        });

        // fix the date ranges
        let timeToFixed = timeTo;
        let timeFromFixed = timeFrom;
        switch (type) {
            case "yearly":
                timeToFixed = timeTo === null ? null : addYears(timeTo, 1);
                timeFromFixed =
                    timeFrom === null ? null : subYears(timeFrom, 1);
                break;
            case "monthly":
                timeToFixed = timeTo === null ? null : addMonths(timeTo, 1);
                timeFromFixed =
                    timeFrom === null ? null : subMonths(timeFrom, 1);
                break;
            case "weekly":
                timeToFixed = timeTo === null ? null : addWeeks(timeTo, 1);
                timeFromFixed =
                    timeFrom === null ? null : subWeeks(timeFrom, 1);
                break;
            case "daily":
                timeToFixed = timeTo === null ? null : addDays(timeTo, 1);
                timeFromFixed = timeFrom === null ? null : subDays(timeFrom, 1);
                break;
        }

        if (
            timeToFixed === null ||
            dataItem.date.getTime() <= timeToFixed.getTime()
        ) {
            if (
                timeFromFixed === null ||
                dataItem.date.getTime() >= timeFromFixed.getTime()
            ) {
                // only push this data and label if they are within the range

                // update the category counts for each category
                Object.keys(categoryInfo).forEach(categoryKey => {
                    categoryCountHistory[categoryKey].push(
                        categoryInfo[categoryKey]
                    );
                });
                Object.keys(categoryTransactionInfo).forEach(categoryKey => {
                    categoryTransactionHistory[categoryKey].sent.push(
                        categoryTransactionInfo[categoryKey].sent
                    );
                    categoryTransactionHistory[categoryKey].received.push(
                        categoryTransactionInfo[categoryKey].received
                    );
                    categoryTransactionHistory[categoryKey].total.push(
                        categoryTransactionInfo[categoryKey].total
                    );
                });

                // update balance and push it to the list
                balanceHistoryData.push(roundMoney(currentBalance));
                // count the events for this timescale
                eventCountHistory.push(dataItem.data.length);
                // update the individual counts
                paymentCountHistory.push(timescaleInfo.payment);
                requestInquiryCountHistory.push(timescaleInfo.requestInquiry);
                requestResponseCountHistory.push(timescaleInfo.requestResponse);
                bunqMeTabCountHistory.push(timescaleInfo.bunqMeTab);

                // masterCardAction individual counts per type
                masterCardActionCountHistory.push(
                    timescaleInfo.masterCardAction
                );
                maestroPaymentCountHistory.push(timescaleInfo.maestroPayment);
                tapAndPayPaymentCountHistory.push(
                    timescaleInfo.tapAndPayPayment
                );
                applePayPaymentCountHistory.push(timescaleInfo.applePayPayment);
                masterCardPaymentCountHistory.push(
                    timescaleInfo.masterCardPayment
                );

                // update the individual counts
                paymentTransactionHistory.push(
                    timescaleTransactionInfo.payment
                );
                requestInquiryTransactionHistory.push(
                    timescaleTransactionInfo.requestInquiry
                );
                requestResponseTransactionHistory.push(
                    timescaleTransactionInfo.requestResponse
                );
                bunqMeTabTransactionHistory.push(
                    timescaleTransactionInfo.bunqMeTab
                );

                // masterCardAction individual counts per type
                masterCardActionTransactionHistory.push(
                    timescaleTransactionInfo.masterCardAction
                );
                masterCardPaymentTransactionHistory.push(
                    timescaleTransactionInfo.maestroPayment
                );
                tapAndPayPaymentTransactionHistory.push(
                    timescaleTransactionInfo.tapAndPayPayment
                );
                maestroPaymentTransactionHistory.push(
                    timescaleTransactionInfo.masterCardPayment
                );
                applePayPaymentTransactionHistory.push(
                    timescaleTransactionInfo.applePayPayment
                );

                // push the label here so we can ignore certain days if required
                labelData.push(label);
            }
        }

        // always update the balance for the next timescale
        currentBalance = currentBalance + timescaleChange;
    });

    // reverse each category separately
    Object.keys(categoryCountHistory).forEach(categoryKey => {
        categoryCountHistory[categoryKey] = categoryCountHistory[
            categoryKey
        ].reverse();
    });
    Object.keys(categoryTransactionHistory).forEach(categoryKey => {
        categoryTransactionHistory[
            categoryKey
        ].sent = categoryTransactionHistory[categoryKey].sent.reverse();
        categoryTransactionHistory[
            categoryKey
        ].received = categoryTransactionHistory[categoryKey].received.reverse();
        categoryTransactionHistory[
            categoryKey
        ].total = categoryTransactionHistory[categoryKey].total.reverse();
    });

    return {
        // x axis labels
        labels: labelData.reverse(),
        // account balance
        balanceHistoryData: balanceHistoryData.reverse(),
        // total event count
        eventCountHistory: eventCountHistory,
        // total category count
        categoryCountHistory: categoryCountHistory,
        categoryTransactionHistory: categoryTransactionHistory,
        // individual history count
        requestResponseHistory: requestResponseCountHistory.reverse(),
        requestInquiryHistory: requestInquiryCountHistory.reverse(),
        bunqMeTabHistory: bunqMeTabCountHistory.reverse(),
        paymentHistory: paymentCountHistory.reverse(),
        masterCardActionHistory: masterCardActionCountHistory.reverse(),
        maestroPaymentCountHistory: maestroPaymentCountHistory.reverse(),
        tapAndPayPaymentCountHistory: tapAndPayPaymentCountHistory.reverse(),
        applePayPaymentCountHistory: applePayPaymentCountHistory.reverse(),
        masterCardPaymentCountHistory: masterCardPaymentCountHistory.reverse(),

        // individual transaction amounts
        paymentTransactionHistory: paymentTransactionHistory.reverse(),
        requestInquiryTransactionHistory: requestInquiryTransactionHistory.reverse(),
        requestResponseTransactionHistory: requestResponseTransactionHistory.reverse(),
        bunqMeTabTransactionHistory: bunqMeTabTransactionHistory.reverse(),
        masterCardActionTransactionHistory: masterCardActionTransactionHistory.reverse(),
        masterCardPaymentTransactionHistory: masterCardPaymentTransactionHistory.reverse(),
        tapAndPayPaymentTransactionHistory: tapAndPayPaymentTransactionHistory.reverse(),
        maestroPaymentTransactionHistory: maestroPaymentTransactionHistory.reverse(),
        applePayPaymentTransactionHistory: applePayPaymentTransactionHistory.reverse()
    };
};

onmessage = e => {
    const events = [
        ...bunqMeTabMapper(
            e.data.bunqMeTabs,
            e.data.bunqMeTabFilterSettings,
            e.data.categories,
            e.data.categoryConnections
        ),
        ...requestInquiryMapper(
            e.data.requestInquiries,
            e.data.requestFilterSettings,
            e.data.categories,
            e.data.categoryConnections
        ),
        ...requestResponseMapper(
            e.data.requestResponses,
            e.data.requestFilterSettings,
            e.data.categories,
            e.data.categoryConnections
        ),
        ...paymentMapper(
            e.data.payments,
            e.data.paymentFilterSettings,
            e.data.categories,
            e.data.categoryConnections
        ),
        ...masterCardActionMapper(
            e.data.masterCardActions,
            e.data.paymentFilterSettings,
            e.data.categories,
            e.data.categoryConnections
        )
    ];

    const data = getData(
        events,
        // account data
        e.data.accounts,
        // full list of categories
        e.data.categories,
        // selected account
        e.data.selectedAccount,
        // date from range
        e.data.timeFrom,
        // date to
        e.data.timeTo,
        // display charts with daily/weekly/monthyl/yearly increments
        e.data.timescale
    );

    postMessage(data);
};
