"use client";
import React, { useState } from "react";

interface EventModalProps {
  event: any;
  onClose: () => void;
  onRespond: (status: string) => Promise<void>;
}

export default function EventModal({ event, onClose, onRespond }: EventModalProps) {
  const [response, setResponse] = useState<string>(event.myResponse || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRespond = async (status: string) => {
    setLoading(true);
    setError("");
    try {
      await onRespond(status);
      setResponse(status);
    } catch (err) {
      setError("Failed to respond");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-2">{event.title} {event.status === "canceled" && <span className="text-red-600">(Canceled)</span>}</h2>
        <p className="mb-2">{event.description}</p>
        <p className="text-sm text-gray-600 mb-1">{new Date(event.dateTime).toLocaleString()}</p>
        <p className="text-sm mb-1">Location: {event.location}</p>
        <p className="text-sm mb-1">Creator: {event.createdBy?.name || "Unknown"}</p>
        <div className="my-2">
          <span className="mr-2">Going: <b>{event.goingCount}</b></span>
          <span className="mr-2">Not going: <b>{event.notGoingCount}</b></span>
          <span>Not interested: <b>{event.notInterestedCount}</b></span>
        </div>
        <div className="mt-4">
          <label className="block mb-2 font-semibold">Your response:</label>
          <div className="flex gap-2">
            {["going", "not going", "not interested"].map((status) => (
              <button
                key={status}
                className={`px-3 py-1 rounded border ${response === status ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                disabled={loading}
                onClick={() => handleRespond(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
