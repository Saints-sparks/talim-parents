import { useState, useRef } from "react";
import axios from "axios";
import moment from "moment";
import { API_BASE_URL } from "../services/auth.services";

const weekdayToNumber = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const subjectColors = {
  Mathematics: "#4285F4",
  English: "#34A853",
  "Verbal Reasoning": "#FBBC05",
  "Elementary schematics": "#EA4335",
  "BREAK - TIME": "#9E9E9E",
};

const parseTimeString = (timeStr) => {
  if (!timeStr) return null;
  
  // Clean up the string
  timeStr = timeStr.trim().toUpperCase();
  
  // Handle cases where "PM/AM" might be attached without space (e.g., "12:00PM")
  timeStr = timeStr.replace(/([0-9])(AM|PM)/i, '$1 $2');
  
  // Try multiple formats
  const formats = [
    "h:mm A",    // 12:00 PM
    "h:mmA",     // 12:00PM
    "H:mm",      // 24-hour format
    "HH:mm",     // 24-hour with leading zero
    "h:mm",      // 12-hour without AM/PM
    "hh:mm A",   // 12-hour with leading zero
  ];
  
  const m = moment(timeStr, formats, true);
  return m.isValid() ? m : null;
};

const convertBackendTimetableToEvents = (timetableByDay) => {
  if (!timetableByDay || typeof timetableByDay !== "object") return [];

  const events = [];
  const today = moment().startOf('isoWeek'); // Start of current week (Monday)

  for (const [dayName, sessions] of Object.entries(timetableByDay)) {
    const dayNum = weekdayToNumber[dayName];
    if (dayNum === undefined) continue;

    const baseDate = today.clone().add(dayNum, 'days');

    sessions.forEach((session) => {
      const startTimeStr = session.startTIme || session.startTime || session.time?.split(" - ")[0];
      const endTimeStr = session.endTime || session.time?.split(" - ")[1];

      const startMoment = parseTimeString(startTimeStr);
      const endMoment = parseTimeString(endTimeStr);

      if (!startMoment || !endMoment) {
        console.warn(`Invalid time format in session:`, session);
        return;
      }

      // Apply to base date
      const eventStart = baseDate.clone()
        .hour(startMoment.hour())
        .minute(startMoment.minute())
        .second(0);

      const eventEnd = baseDate.clone()
        .hour(endMoment.hour())
        .minute(endMoment.minute())
        .second(0);

      events.push({
        id: `${dayName}-${session.subject || session.course}-${startTimeStr}`,
        title: session.subject || session.course || "No Title",
        start: eventStart.toDate(),
        end: eventEnd.toDate(),
        textColor: subjectColors[session.subject] || "#000000",
        resource: session,
      });
    });
  }

  return events;
};

export const useTimetable = () => {
  const [timetables, setTimetables] = useState({});
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const authToken = localStorage.getItem("access_token");
  const axiosAuth = axios.create({
    baseURL: API_BASE_URL,
    headers: { Authorization: `Bearer ${authToken}` },
  });

  const fetchInProgress = useRef(false);
  const lastFetchedClassId = useRef(null);

  const getTimetableByClass = async (classId) => {
    if (!classId) return null;
    if (fetchInProgress.current) return null;
    if (lastFetchedClassId.current === classId) return null;

    fetchInProgress.current = true;
    setLoading(true);
    try {
      const response = await axiosAuth.get(`/timetable/class/${classId}`);
      console.log("API Response:", response.data); // Debug log
      setTimetables(response.data);
      const convertedEvents = convertBackendTimetableToEvents(response.data);
      console.log("Converted Events:", convertedEvents); // Debug log
      setEvents(convertedEvents);
      setError(null);
      lastFetchedClassId.current = classId;
      return response.data;
    } catch (err) {
      console.error("Error fetching timetable:", err);
      setError(err.response?.data?.message || err.message || "Failed to fetch timetable");
      return null;
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  };

  const getTimetableByTeacher = async (teacherId) => {
    setLoading(true);
    try {
      const response = await axiosAuth.get(`/timetable/teacher/${teacherId}`);
      setTimetables(response.data);
      setEvents(convertBackendTimetableToEvents(response.data));
      setError(null);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch timetable");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createTimetable = async (timetableData) => {
    setLoading(true);
    try {
      const response = await axiosAuth.post('/timetable', timetableData);
      setError(null);
      // Reset lastFetchedClassId to force refetch after creation
      lastFetchedClassId.current = null;
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to create timetable");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateTimetable = async (id, updateData) => {
    setLoading(true);
    try {
      const response = await axiosAuth.put(`/timetable/${id}`, updateData);
      setError(null);
      lastFetchedClassId.current = null;
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update timetable");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteTimetable = async (id) => {
    setLoading(true);
    try {
      await axiosAuth.delete(`/timetable/${id}`);
      setError(null);
      lastFetchedClassId.current = null;
      return true;
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to delete timetable");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    timetables,
    events,
    loading,
    error,
    getTimetableByClass,
    getTimetableByTeacher,
    createTimetable,
    updateTimetable,
    deleteTimetable,
  };
};
