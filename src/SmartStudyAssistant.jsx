import React, { useState, useEffect, useRef } from 'react';
import { Upload, BookOpen, Brain, Calendar, MessageSquare, Zap, Clock, Trophy, ChevronRight, X, Check, AlertCircle, Loader2 } from 'lucide-react';

const SmartStudyAssistant = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [materials, setMaterials] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [studyPlan, setStudyPlan] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState(null);
  const [notification, setNotification] = useState(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [courses, setCourses] = useState([]);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', topics: '', credits: '', examDate: '' });
  const [semesterPlan, setSemesterPlan] = useState(null);
  const [studyDays, setStudyDays] = useState(30);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      
      if (hour === 9 && now.getMinutes() === 0) {
        showNotification('🌅 Good morning! Time to start your study session!', 'success');
      } else if (hour === 14 && now.getMinutes() === 0) {
        showNotification('📚 Afternoon study time! Let\'s review your materials.', 'info');
      } else if (hour === 20 && now.getMinutes() === 0) {
        showNotification('🌙 Evening review time! Consistency is key to success.', 'info');
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showNotification('Please upload a PDF file', 'error');
      return;
    }

    setLoading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target.result.split(',')[1];
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: base64Data
                  }
                },
                {
                  type: 'text',
                  text: 'Please provide a comprehensive summary of this study material in 3-5 paragraphs. Focus on key concepts, main ideas, and important details that would be useful for exam preparation.'
                }
              ]
            }]
          })
        });

        const data = await response.json();
        const summary = data.content.find(c => c.type === 'text')?.text || 'Summary not available';

        const newMaterial = {
          id: Date.now(),
          name: file.name,
          uploadDate: new Date().toISOString(),
          summary: summary,
          file: file
        };

        setMaterials(prev => [...prev, newMaterial]);
        setCurrentMaterial(newMaterial);
        showNotification('✅ Material uploaded and summarized successfully!', 'success');
        setActiveTab('materials');
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      showNotification('Error processing file. Please try again.', 'error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateFlashcards = async (material) => {
    setLoading(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Based on this study material summary: "${material.summary}"\n\nCreate 8 flashcards in JSON format only (no markdown, no preamble). Return ONLY a JSON array like this:\n[{"question": "...", "answer": "..."}]`
          }]
        })
      });

      const data = await response.json();
      const text = data.content.find(c => c.type === 'text')?.text || '[]';
      const cleanText = text.replace(/```json|```/g, '').trim();
      const cards = JSON.parse(cleanText);

      const newFlashcards = {
        id: Date.now(),
        materialId: material.id,
        materialName: material.name,
        cards: cards
      };

      setFlashcards(prev => [...prev, newFlashcards]);
      showNotification('🎴 Flashcards generated successfully!', 'success');
      setActiveTab('flashcards');
    } catch (error) {
      showNotification('Error generating flashcards', 'error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async (material) => {
    setLoading(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Based on this study material: "${material.summary}"\n\nCreate a 5-question multiple choice quiz in JSON format only (no markdown). Return ONLY a JSON array:\n[{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..."}]`
          }]
        })
      });

      const data = await response.json();
      const text = data.content.find(c => c.type === 'text')?.text || '[]';
      const cleanText = text.replace(/```json|```/g, '').trim();
      const questions = JSON.parse(cleanText);

      const newQuiz = {
        id: Date.now(),
        materialId: material.id,
        materialName: material.name,
        questions: questions
      };

      setQuizzes(prev => [...prev, newQuiz]);
      showNotification('📝 Quiz generated successfully!', 'success');
      setActiveTab('quiz');
    } catch (error) {
      showNotification('Error generating quiz', 'error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateStudyPlan = async () => {
    setLoading(true);
    try {
      const materialsText = materials.map(m => m.name).join(', ');
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Create a 7-day study plan for these materials: ${materialsText}. Return ONLY JSON (no markdown):\n{"days": [{"day": 1, "date": "...", "tasks": ["..."], "duration": "2 hours", "focus": "..."}]}`
          }]
        })
      });

      const data = await response.json();
      const text = data.content.find(c => c.type === 'text')?.text || '{}';
      const cleanText = text.replace(/```json|```/g, '').trim();
      const plan = JSON.parse(cleanText);

      setStudyPlan(plan);
      showNotification('📅 Study plan created!', 'success');
      setActiveTab('plan');
    } catch (error) {
      showNotification('Error generating study plan', 'error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCourse = () => {
    if (!newCourse.name || !newCourse.topics) {
      showNotification('Please fill in course name and topics', 'error');
      return;
    }

    const course = {
      id: Date.now(),
      name: newCourse.name,
      topics: newCourse.topics.split(',').map(t => t.trim()),
      credits: parseInt(newCourse.credits) || 3,
      examDate: newCourse.examDate,
      addedDate: new Date().toISOString()
    };

    setCourses(prev => [...prev, course]);
    setNewCourse({ name: '', topics: '', credits: '', examDate: '' });
    setShowCourseModal(false);
    showNotification('✅ Course added successfully!', 'success');
  };

  const generateSemesterPlan = async () => {
    if (courses.length === 0) {
      showNotification('Please add at least one course first', 'error');
      return;
    }

    setLoading(true);
    try {
      const coursesInfo = courses.map(c => 
        `${c.name} (${c.credits} credits, Topics: ${c.topics.join(', ')}${c.examDate ? `, Exam: ${c.examDate}` : ''})`
      ).join('\n');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Create a comprehensive ${studyDays}-day study timetable for these courses:

${coursesInfo}

Consider:
- Allocate more time to courses with more credits
- Prioritize courses with earlier exam dates
- Balance workload across all days
- Include review sessions before exams
- Mix different subjects each day for variety
- Include rest days/lighter days

Return ONLY a JSON object (no markdown) with this structure:
{
  "totalDays": ${studyDays},
  "schedule": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "sessions": [
        {
          "course": "Course Name",
          "topics": ["topic1", "topic2"],
          "duration": "2 hours",
          "timeSlot": "Morning",
          "type": "Study/Review/Practice"
        }
      ],
      "totalHours": "4 hours",
      "notes": "Focus area for the day"
    }
  ],
  "summary": {
    "totalStudyHours": 120,
    "coursesBreakdown": [{"course": "...", "hours": 40}]
  }
}`
          }]
        })
      });

      const data = await response.json();
      const text = data.content.find(c => c.type === 'text')?.text || '{}';
      const cleanText = text.replace(/```json|```/g, '').trim();
      const plan = JSON.parse(cleanText);

      setSemesterPlan(plan);
      showNotification('📚 Semester timetable created!', 'success');
      setActiveTab('semester');
    } catch (error) {
      showNotification('Error generating semester plan', 'error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setLoading(true);

    try {
      const context = materials.length > 0 
        ? `Context from study materials: ${materials.map(m => m.summary).join('\n\n')}\n\n`
        : '';

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: context + chatInput }
          ]
        })
      });

      const data = await response.json();
      const assistantMessage = {
        role: 'assistant',
        content: data.content.find(c => c.type === 'text')?.text || 'I apologize, I could not process that.'
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      showNotification('Error sending message', 'error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizAnswer = (questionIndex, optionIndex) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
    const currentQuiz = quizzes[quizzes.length - 1];
    const correct = currentQuiz.questions.filter((q, i) => quizAnswers[i] === q.correct).length;
    const percentage = (correct / currentQuiz.questions.length) * 100;
    
    showNotification(
      `Quiz completed! Score: ${correct}/${currentQuiz.questions.length} (${percentage.toFixed(0)}%)`,
      percentage >= 70 ? 'success' : 'info'
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in ${
          notification.type === 'success' ? 'bg-green-500' :
          notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}>
          {notification.type === 'success' && <Check className="w-5 h-5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {notification.type === 'info' && <Zap className="w-5 h-5" />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-12 h-12 text-indigo-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Smart Study Assistant
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Your AI-powered learning companion</p>
        </header>

        <nav className="flex flex-wrap gap-2 mb-8 bg-white rounded-xl p-2 shadow-lg">
          {[
            { id: 'upload', icon: Upload, label: 'Upload' },
            { id: 'materials', icon: BookOpen, label: 'Materials', badge: materials.length },
            { id: 'flashcards', icon: Brain, label: 'Flashcards', badge: flashcards.length },
            { id: 'quiz', icon: Trophy, label: 'Quiz', badge: quizzes.length },
            { id: 'plan', icon: Calendar, label: 'Study Plan' },
            { id: 'semester', icon: Clock, label: 'Semester Plan' },
            { id: 'chat', icon: MessageSquare, label: 'Q&A' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              {tab.badge > 0 && (
                <span className="bg-white text-indigo-600 text-xs px-2 py-1 rounded-full font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {activeTab === 'upload' && (
            <div className="text-center">
              <Upload className="w-20 h-20 text-indigo-600 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">Upload Study Materials</h2>
              <p className="text-gray-600 mb-8">Upload PDF notes or lecture materials to get started</p>
              
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={loading}
                />
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all inline-flex items-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Choose PDF File
                    </>
                  )}
                </div>
              </label>

              {materials.length > 0 && (
                <div className="mt-12 text-left">
                  <h3 className="text-xl font-bold mb-4">Recent Uploads</h3>
                  <div className="space-y-3">
                    {materials.slice(-3).map(material => (
                      <div key={material.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="font-semibold text-indigo-600">{material.name}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(material.uploadDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

{activeTab === 'materials' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Study Materials</h2>
              {materials.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No materials uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {materials.map(material => (
                    <div key={material.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-indigo-600">{material.name}</h3>
                          <p className="text-sm text-gray-500">
                            Uploaded: {new Date(material.uploadDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => generateFlashcards(material)}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm"
                          >
                            <Brain className="w-4 h-4 inline mr-1" />
                            Flashcards
                          </button>
                          <button
                            onClick={() => generateQuiz(material)}
                            disabled={loading}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 text-sm"
                          >
                            <Trophy className="w-4 h-4 inline mr-1" />
                            Quiz
                          </button>
                        </div>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Summary:</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{material.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'flashcards' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Flashcards</h2>
              {flashcards.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No flashcards generated yet</p>
                  <p className="text-sm mt-2">Upload materials and click "Flashcards" to create them</p>
                </div>
              ) : (
                <div>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg mb-6"
                    onChange={(e) => {
                      const deck = flashcards.find(f => f.id === parseInt(e.target.value));
                      if (deck) {
                        setCurrentFlashcardIndex(0);
                        setShowAnswer(false);
                      }
                    }}
                  >
                    {flashcards.map(deck => (
                      <option key={deck.id} value={deck.id}>
                        {deck.materialName} ({deck.cards.length} cards)
                      </option>
                    ))}
                  </select>

                  {flashcards.length > 0 && (
                    <div className="max-w-2xl mx-auto">
                      <div className="text-center mb-4 text-gray-600">
                        Card {currentFlashcardIndex + 1} of {flashcards[flashcards.length - 1].cards.length}
                      </div>
                      
                      <div
                        className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-8 min-h-64 flex items-center justify-center cursor-pointer shadow-xl"
                        onClick={() => setShowAnswer(!showAnswer)}
                      >
                        <div className="text-center">
                          {!showAnswer ? (
                            <div>
                              <h3 className="text-2xl font-bold mb-4">Question:</h3>
                              <p className="text-xl">{flashcards[flashcards.length - 1].cards[currentFlashcardIndex].question}</p>
                              <p className="text-sm mt-6 opacity-75">Click to reveal answer</p>
                            </div>
                          ) : (
                            <div>
                              <h3 className="text-2xl font-bold mb-4">Answer:</h3>
                              <p className="text-xl">{flashcards[flashcards.length - 1].cards[currentFlashcardIndex].answer}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between mt-6">
                        <button
                          onClick={() => {
                            setCurrentFlashcardIndex(Math.max(0, currentFlashcardIndex - 1));
                            setShowAnswer(false);
                          }}
                          disabled={currentFlashcardIndex === 0}
                          className="px-6 py-3 bg-gray-300 rounded-lg hover:bg-gray-400 disabled:opacity-50 font-semibold"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => {
                            setCurrentFlashcardIndex(
                              Math.min(flashcards[flashcards.length - 1].cards.length - 1, currentFlashcardIndex + 1)
                            );
                            setShowAnswer(false);
                          }}
                          disabled={currentFlashcardIndex === flashcards[flashcards.length - 1].cards.length - 1}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'quiz' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Practice Quiz</h2>
              {quizzes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No quizzes generated yet</p>
                  <p className="text-sm mt-2">Upload materials and click "Quiz" to create one</p>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto">
                  {quizzes[quizzes.length - 1].questions.map((q, qIndex) => (
                    <div key={qIndex} className="mb-8 p-6 border border-gray-200 rounded-xl">
                      <h3 className="text-lg font-bold mb-4">
                        Question {qIndex + 1}: {q.question}
                      </h3>
                      <div className="space-y-3">
                        {q.options.map((option, oIndex) => (
                          <button
                            key={oIndex}
                            onClick={() => handleQuizAnswer(qIndex, oIndex)}
                            disabled={quizSubmitted}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                              quizSubmitted
                                ? oIndex === q.correct
                                  ? 'border-green-500 bg-green-50'
                                  : quizAnswers[qIndex] === oIndex
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-gray-200'
                                : quizAnswers[qIndex] === oIndex
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                quizAnswers[qIndex] === oIndex ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                              }`}>
                                {quizAnswers[qIndex] === oIndex && <Check className="w-4 h-4 text-white" />}
                              </div>
                              <span>{option}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      {quizSubmitted && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}

                  {!quizSubmitted ? (
                    <button
                      onClick={submitQuiz}
                      disabled={Object.keys(quizAnswers).length !== quizzes[quizzes.length - 1].questions.length}
                      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      Submit Quiz
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setQuizAnswers({});
                        setQuizSubmitted(false);
                      }}
                      className="w-full py-4 bg-gray-600 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
                    >
                      Reset Quiz
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'plan' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Study Plan</h2>
              {!studyPlan ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-6">No study plan created yet</p>
                  <button
                    onClick={generateStudyPlan}
                    disabled={materials.length === 0 || loading}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate Study Plan'}
                  </button>
                  {materials.length === 0 && (
                    <p className="text-sm text-gray-500 mt-4">Upload materials first</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {studyPlan.days.map(day => (
                    <div key={day.day} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold">
                          {day.day}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">Day {day.day}</h3>
                          <p className="text-sm text-gray-500">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {day.duration}
                          </p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <span className="font-semibold">Focus:</span> {day.focus}
                      </div>
                      <ul className="space-y-2">
                        {day.tasks.map((task, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <ChevronRight className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'semester' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Semester Planning</h2>
              
              <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">My Courses</h3>
                  <button
                    onClick={() => setShowCourseModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    + Add Course
                  </button>
                </div>

                {courses.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-xl">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No courses added yet</p>
                    <p className="text-sm mt-2">Add courses to generate your semester timetable</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {courses.map(course => (
                      <div key={course.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-indigo-600">{course.name}</h4>
                          <span className="text-sm bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                            {course.credits} credits
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Topics:</strong> {course.topics.join(', ')}
                        </div>
                        {course.examDate && (
                          <div className="text-sm text-gray-500">
                            📅 Exam: {new Date(course.examDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {courses.length > 0 && !semesterPlan && (
                  <div className="bg-indigo-50 rounded-lg p-6">
                    <label className="block mb-3 font-semibold">
                      Study Period (days):
                      <input
                        type="number"
                        value={studyDays}
                        onChange={(e) => setStudyDays(Math.max(7, Math.min(120, parseInt(e.target.value) || 30)))}
                        className="ml-3 px-3 py-2 border border-gray-300 rounded w-24"
                        min="7"
                        max="120"
                      />
                    </label>
                    <button
                      onClick={generateSemesterPlan}
                      disabled={loading}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating Timetable...
                        </span>
                      ) : (
                        'Generate Semester Timetable'
                      )}
                    </button>
                  </div>
                )}
              </div>

              {semesterPlan && (
                <div>
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-6 mb-6">
                    <h3 className="text-2xl font-bold mb-4">📚 Your {semesterPlan.totalDays}-Day Study Timetable</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-3xl font-bold">{semesterPlan.summary.totalStudyHours}</div>
                        <div className="text-sm opacity-90">Total Study Hours</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold">{courses.length}</div>
                        <div className="text-sm opacity-90">Courses</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold">{semesterPlan.totalDays}</div>
                        <div className="text-sm opacity-90">Days</div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-bold text-lg mb-3">Course Hours Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {semesterPlan.summary.coursesBreakdown.map((item, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3">
                          <div className="font-semibold text-indigo-600">{item.course}</div>
                          <div className="text-2xl font-bold">{item.hours}h</div>
                        </div>
                      ))}
                    </div>
                  </div>

<div className="space-y-4 max-h-96 overflow-y-auto">
                    {semesterPlan.schedule.map(day => (
                      <div key={day.day} className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm">
                              {day.day}
                            </div>
                            <div>
                              <h4 className="font-bold">Day {day.day}</h4>
                              <p className="text-sm text-gray-500">{day.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Total</div>
                            <div className="font-bold text-indigo-600">{day.totalHours}</div>
                          </div>
                        </div>

                        <div className="space-y-3 mb-3">
                          {day.sessions.map((session, i) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="font-semibold text-indigo-600">{session.course}</div>
                                  <div className="text-sm text-gray-600">{session.topics.join(', ')}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded mb-1">
                                    {session.timeSlot}
                                  </div>
                                  <div className="text-xs text-gray-500">{session.duration}</div>
                                </div>
                              </div>
                              <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded inline-block">
                                {session.type}
                              </div>
                            </div>
                          ))}
                        </div>

                        {day.notes && (
                          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 text-sm">
                            <strong>💡 Focus:</strong> {day.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setSemesterPlan(null)}
                    className="mt-6 w-full py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all"
                  >
                    Create New Timetable
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Q&A Assistant</h2>
              <div className="bg-gray-50 rounded-xl p-4 h-96 overflow-y-auto mb-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Ask me anything about your study materials!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-800'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl">
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>
              
              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question about your study materials..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !chatInput.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>

        {showCourseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Add Course</h3>
                <button
                  onClick={() => setShowCourseModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Course Name *</label>
                  <input
                    type="text"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                    placeholder="e.g., Data Structures"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Topics (comma-separated) *</label>
                  <input
                    type="text"
                    value={newCourse.topics}
                    onChange={(e) => setNewCourse({...newCourse, topics: e.target.value})}
                    placeholder="e.g., Arrays, Linked Lists, Trees"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Credits</label>
                  <input
                    type="number"
                    value={newCourse.credits}
                    onChange={(e) => setNewCourse({...newCourse, credits: e.target.value})}
                    placeholder="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    min="1"
                    max="6"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Exam Date (optional)</label>
                  <input
                    type="date"
                    value={newCourse.examDate}
                    onChange={(e) => setNewCourse({...newCourse, examDate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCourseModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCourse}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    Add Course
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-12 text-center text-gray-600">
          <p className="flex items-center justify-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            Powered by Claude AI - Built for smarter studying
          </p>
        </footer>
      </div>
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SmartStudyAssistant;
