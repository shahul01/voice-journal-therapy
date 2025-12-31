# Voice Journal Therapy - System Architecture Flowchart

## Simplified Flow (Quick Overview)

This is a high-level view of how the system works - perfect for understanding the basics.

```mermaid
flowchart LR
    User["👤 User<br/>Speaks"] --> Mic["🎤 Microphone<br/>Captures Audio"]
    Mic --> VAD["🔊 Voice Detection<br/>Detects Silence"]
    VAD --> STT["🎙️ ElevenLabs<br/>Speech → Text"]
    STT --> Parallel{"⚡ Parallel Processing<br/>(Promise.all)"}
    Parallel --> Crisis["🚨 Crisis Check<br/>Gemini AI"]
    Parallel --> AI["🧠 Gemini AI<br/>Generates Response"]
    Crisis --> Merge["Merge Results"]
    AI --> Merge
    Merge --> TTS["🔊 ElevenLabs<br/>Text → Speech"]
    TTS --> Speaker["🔊 Speaker<br/>Plays Response"]
    Speaker --> User

    style User fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    style Mic fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style VAD fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style STT fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    style Parallel fill:#fff9c4,stroke:#f57f17,stroke-width:3px
    style Crisis fill:#ffebee,stroke:#b71c1c,stroke-width:2px
    style AI fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    style Merge fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style TTS fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    style Speaker fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
```

**How it works:**
1. **User speaks** into their device microphone
2. **Voice Activity Detection** waits for silence (1.5 seconds)
3. **ElevenLabs STT** converts speech to text
4. **Parallel Processing** runs simultaneously:
   - **Crisis Detection** analyzes conversation for safety concerns
   - **Gemini AI** generates an empathetic response
5. **ElevenLabs TTS** converts response to natural speech
6. **Audio plays back** to the user
7. **Loop continues** automatically for continuous conversation

**Key Technologies:**
- 🎙️ **ElevenLabs**: Voice input/output (STT + TTS)
- 🧠 **Google Gemini 2.5 Flash**: AI reasoning and crisis detection
- 🔊 **Web Audio API**: Real-time voice activity detection
- 💾 **Supabase**: User data and conversation storage

**Performance Optimization:**
- ⚡ **Parallel Processing**: Crisis detection and AI response generation run simultaneously using `Promise.all()`, reducing response time by ~50%

---

## Complete System Flow

```mermaid
flowchart TB
    %% User Interface Layer
    subgraph UI["🖥️ UI Layer (+page.svelte)"]
        UIState["UI State:<br/>idle | listening | processing | speaking"]
        ButtonState["Button State:<br/>isListening: true/false"]
        ConversationDisplay["Conversation Display<br/>(messages array)"]
    end

    %% Orchestrator - Central Controller
    subgraph Orchestrator["🎛️ ConversationOrchestrator"]
        direction TB
        OrchestratorState["Orchestrator State:<br/>currentState: idle/listening/processing/speaking<br/>isRecording: boolean<br/>isProcessing: boolean<br/>manualStop: boolean"]

        StartMethod["start()"]
        StopMethod["stop()"]
        ProcessMethod["processUserSpeech()"]
    end

    %% Audio Capture Pipeline
    subgraph AudioCapture["🎤 Audio Capture Pipeline"]
        direction TB
        MediaRecorder["MediaRecorder<br/>(getUserMedia API)"]
        AudioChunks["Audio Chunks<br/>(Blob[] - 1s intervals)"]
        WAVConverter["WAV Converter<br/>(convertToWav)"]
        WAVBlob["WAV Blob<br/>(ready for STT)"]
    end

    %% Voice Activity Detection
    subgraph VAD["🔊 Voice Activity Detector"]
        direction TB
        AudioContext["AudioContext<br/>(frequency analysis)"]
        AnalyserNode["AnalyserNode<br/>(FFT analysis)"]
        SpeechDetection["Speech Detection:<br/>threshold: 30<br/>silenceDuration: 1500ms"]
        SpeechStart["onSpeechStart()"]
        SpeechEnd["onSpeechEnd()<br/>(500ms timeout)"]
    end

    %% ElevenLabs Services
    subgraph ElevenLabs["🎙️ ElevenLabs AI Services"]
        direction TB
        STT["Speech-to-Text API<br/>(/api/v1/elevenlabs/stt)"]
        TTS["Text-to-Speech API<br/>(/api/v1/elevenlabs/tts)<br/>Model: eleven_flash_v2_5"]
    end

    %% Google Vertex AI
    subgraph VertexAI["🧠 Google Vertex AI (Gemini)"]
        direction TB
        RequestQueue["Request Queue<br/>(Priority-based)"]
        RateLimitTracker["Rate Limit Tracker<br/>(RPM/TPM/RPD)"]
        ResponseCache["Response Cache<br/>(deduplication)"]
        GeminiAPI["Gemini API<br/>(/api/v1/google/gemini)<br/>Model: gemini-2.5-flash"]
        ContextWindow["Context Window<br/>(last 20 messages)"]
    end

    %% Crisis Detection System
    subgraph CrisisDetection["🚨 Crisis Detection"]
        direction TB
        CrisisAPI["Crisis Detection API<br/>(/api/v1/crisis/detect)"]
        CrisisAnalysis["Analyze Messages<br/>(detectCrisisLevel)"]
        CrisisResult["Crisis Result:<br/>level, confidence, indicators"]
    end

    %% Audio Playback
    subgraph AudioPlayback["🔊 Audio Playback"]
        direction TB
        AudioPlaybackObj["AudioPlayback<br/>(Web Audio API)"]
        PlayAudio["Play Audio<br/>(ArrayBuffer)"]
    end

    %% Conversation State Management
    subgraph ConversationState["💬 Conversation State"]
        direction TB
        MessagesArray["Messages Array<br/>(full history)"]
        ContextWindowState["Context Window<br/>(last 20 messages)"]
        LocalStorage["localStorage<br/>(persistence)"]
    end

    %% Main Flow - User Starts Recording
    UI -->|"User clicks<br/>Start Recording"| StartMethod
    StartMethod -->|"1. Set isRecording=true<br/>2. Clear audioChunks<br/>3. updateState('listening')<br/>4. onRecordingStateChange(true)"| OrchestratorState
    StartMethod -->|"Create AudioCapture"| MediaRecorder
    MediaRecorder -->|"Request microphone<br/>permission"| AudioChunks
    AudioChunks -->|"onDataAvailable<br/>(every 1s)"| OrchestratorState
    StartMethod -->|"Setup VAD"| AudioContext
    AudioContext -->|"Analyze stream"| AnalyserNode
    AnalyserNode -->|"Real-time frequency<br/>analysis"| SpeechDetection

    %% VAD Triggers Processing
    SpeechDetection -->|"User speaks<br/>(average > threshold)"| SpeechStart
    SpeechStart -->|"If state='speaking'"| AudioPlaybackObj
    AudioPlaybackObj -->|"interruptAI()"| OrchestratorState
    SpeechDetection -->|"Silence detected<br/>(>1500ms)"| SpeechEnd
    SpeechEnd -->|"500ms timeout"| ProcessMethod

    %% Processing User Speech
    ProcessMethod -->|"1. Set isProcessing=true<br/>2. updateState('processing')<br/>3. Stop audioCapture<br/>4. Set audioCapture=null"| OrchestratorState
    ProcessMethod -->|"Collect audio chunks"| AudioChunks
    AudioChunks -->|"Blob(audioChunks)"| WAVConverter
    WAVConverter -->|"Convert to WAV format"| WAVBlob
    WAVBlob -->|"POST /api/v1/elevenlabs/stt"| STT
    STT -->|"Transcribed text"| ProcessMethod

    %% Add User Message
    ProcessMethod -->|"addMessage(state, 'user', text)"| MessagesArray
    MessagesArray -->|"Update contextWindow<br/>(last 20 messages)"| ContextWindowState
    ContextWindowState -->|"onTranscriptUpdate()"| ConversationDisplay
    MessagesArray -->|"saveConversationToStorage()"| LocalStorage

    %% Crisis Detection
    ProcessMethod -->|"detectAndHandleCrisis()"| CrisisAPI
    MessagesArray -->|"Send messages array"| CrisisAPI
    CrisisAPI -->|"Analyze conversation"| CrisisAnalysis
    CrisisAnalysis -->|"Gemini 2.5 Flash<br/>(crisis detection)"| GeminiAPI
    GeminiAPI -->|"Detection result"| CrisisResult
    CrisisResult -->|"onCrisisDetected()"| ProcessMethod

    %% Get AI Response - Runs in parallel with Crisis Detection using Promise.all()
    ProcessMethod -->|"Promise.all([getAIResponse(), detectAndHandleCrisis()])"| ResponseCache
    ResponseCache -->|"Cache miss"| RequestQueue
    RequestQueue -->|"Check rate limits"| RateLimitTracker
    RateLimitTracker -->|"RPM: 15/min<br/>TPM: 1M/min<br/>RPD: 1500/day"| RequestQueue
    RequestQueue -->|"Enqueue request<br/>(priority: normal)"| GeminiAPI
    ContextWindowState -->|"getContextForGemini()<br/>(format messages)"| GeminiAPI
    GeminiAPI -->|"AI response text"| RequestQueue
    RequestQueue -->|"Cache response"| ResponseCache
    ResponseCache -->|"Return response"| ProcessMethod

    %% Add AI Message & Speak
    ProcessMethod -->|"addMessage(state, 'ai', text)"| MessagesArray
    MessagesArray -->|"Update contextWindow"| ContextWindowState
    ProcessMethod -->|"speakResponse(text)"| OrchestratorState
    OrchestratorState -->|"updateState('speaking')"| UIState
    ProcessMethod -->|"POST /api/v1/elevenlabs/tts"| TTS
    TTS -->|"Audio ArrayBuffer"| AudioPlaybackObj
    AudioPlaybackObj -->|"Play audio"| PlayAudio
    PlayAudio -->|"Audio finished<br/>(callback)"| ProcessMethod

    %% Auto-Restart Flow
    ProcessMethod -->|"isProcessing=false<br/>Check: wasRecording && !manualStop"| OrchestratorState
    OrchestratorState -->|"if true: await start()<br/>if false: updateState('idle')"| StartMethod
    StartMethod -->|"Auto-restart recording"| MediaRecorder

    %% Manual Stop Flow
    UI -->|"User clicks<br/>Stop Recording"| StopMethod
    StopMethod -->|"1. Set manualStop=true<br/>2. Set isRecording=false<br/>3. onRecordingStateChange(false)<br/>4. Stop all components<br/>5. Clear audioChunks<br/>6. updateState('idle')"| OrchestratorState
    StopMethod -->|"Stop MediaRecorder"| MediaRecorder
    StopMethod -->|"Stop VAD"| AudioContext
    StopMethod -->|"Stop AudioPlayback"| AudioPlaybackObj

    %% State Synchronization
    OrchestratorState -->|"onStateChange(state)"| UIState
    OrchestratorState -->|"onRecordingStateChange(isRecording)"| ButtonState
    OrchestratorState -->|"onTranscriptUpdate(state)"| ConversationDisplay

    %% Error Handling
    MediaRecorder -->|"onError"| OrchestratorState
    STT -->|"Error"| OrchestratorState
    TTS -->|"Error"| OrchestratorState
    GeminiAPI -->|"Error"| RequestQueue
    RequestQueue -->|"Error"| ProcessMethod
    ProcessMethod -->|"onError(error)"| UIState

    %% Styling
    classDef uiClass fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef orchestratorClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef audioClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef aiClass fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef stateClass fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef crisisClass fill:#ffebee,stroke:#b71c1c,stroke-width:2px

    class UI,UIState,ButtonState,ConversationDisplay uiClass
    class Orchestrator,OrchestratorState,StartMethod,StopMethod,ProcessMethod orchestratorClass
    class AudioCapture,MediaRecorder,AudioChunks,WAVConverter,WAVBlob,AudioPlayback,AudioPlaybackObj,PlayAudio,VAD,AudioContext,AnalyserNode,SpeechDetection,SpeechStart,SpeechEnd audioClass
    class ElevenLabs,STT,TTS,VertexAI,RequestQueue,RateLimitTracker,ResponseCache,GeminiAPI aiClass
    class ConversationState,MessagesArray,ContextWindowState,LocalStorage,ContextWindow stateClass
    class CrisisDetection,CrisisAPI,CrisisAnalysis,CrisisResult crisisClass
```

## State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle: App Initialized

    Idle --> Listening: User clicks<br/>"Start Recording"<br/>(orchestrator.start())

    Listening --> Processing: VAD detects<br/>speech end<br/>(500ms timeout)

    Processing --> Processing: Transcribe audio<br/>(ElevenLabs STT)
    Processing --> Processing: Get AI response<br/>(Gemini API)
    Processing --> Speaking: AI response ready<br/>(speakResponse())

    Speaking --> Listening: Audio playback<br/>finished + auto-restart<br/>(wasRecording && !manualStop)
    Speaking --> Idle: Audio playback<br/>finished + no restart<br/>(manualStop || !wasRecording)

    Listening --> Idle: User clicks<br/>"Stop Recording"<br/>(orchestrator.stop())
    Processing --> Idle: User clicks<br/>"Stop Recording"<br/>(sets manualStop=true)
    Speaking --> Idle: User clicks<br/>"Stop Recording"<br/>(interruptAI())

    Processing --> Listening: Error recovery<br/>+ auto-restart
    Processing --> Idle: Error recovery<br/>+ no restart

    note right of Listening
        isRecording = true
        audioCapture active
        VAD monitoring
        Button: "Stop Recording"
    end note

    note right of Processing
        isRecording = true (maintained)
        audioCapture = null (stopped)
        isProcessing = true
        Button: "Stop Recording"
    end note

    note right of Speaking
        isRecording = true (maintained)
        audioCapture = null
        isProcessing = false
        Button: "Stop Recording"
    end note
```

## Component Interaction Sequence

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Orchestrator
    participant AudioCapture
    participant VAD
    participant STT
    participant Gemini
    participant CrisisDetection
    participant TTS
    participant AudioPlayback

    User->>UI: Click "Start Recording"
    UI->>Orchestrator: start()
    Orchestrator->>AudioCapture: start()
    AudioCapture->>User: Request microphone
    AudioCapture-->>Orchestrator: Stream available
    Orchestrator->>VAD: setupVAD(stream)
    Orchestrator->>UI: onStateChange('listening')
    Orchestrator->>UI: onRecordingStateChange(true)

    loop Every 1 second
        AudioCapture->>Orchestrator: onDataAvailable(blob)
        Orchestrator->>Orchestrator: audioChunks.push(blob)
    end

    VAD->>VAD: Detect speech (threshold > 30)
    VAD->>Orchestrator: onSpeechStart()
    VAD->>VAD: Detect silence (>1500ms)
    VAD->>Orchestrator: onSpeechEnd()

    Note over Orchestrator: 500ms timeout
    Orchestrator->>Orchestrator: processUserSpeech()
    Orchestrator->>Orchestrator: updateState('processing')
    Orchestrator->>AudioCapture: stop()
    Orchestrator->>Orchestrator: audioCapture = null
    Orchestrator->>Orchestrator: Blob(audioChunks)
    Orchestrator->>Orchestrator: convertToWav()
    Orchestrator->>STT: POST /api/v1/elevenlabs/stt
    STT-->>Orchestrator: Transcribed text
    Orchestrator->>Orchestrator: addMessage('user', text)
    Orchestrator->>UI: onTranscriptUpdate()

    Note over Orchestrator,Gemini: Parallel Execution with Promise.all()
    par Crisis Detection (runs in parallel)
        Orchestrator->>CrisisDetection: detectAndHandleCrisis()
        CrisisDetection->>Gemini: Analyze for crisis indicators
        Gemini-->>CrisisDetection: Crisis result (level, confidence)
        CrisisDetection-->>Orchestrator: onCrisisDetected()
    and AI Response Generation (runs in parallel)
        Orchestrator->>Gemini: getAIResponse()<br/>(via RequestQueue)
        Gemini-->>Orchestrator: AI response text
    end
    Note over Orchestrator,Gemini: Both operations complete together

    Orchestrator->>Orchestrator: addMessage('ai', text)
    Orchestrator->>Orchestrator: speakResponse(text)
    Orchestrator->>Orchestrator: updateState('speaking')
    Orchestrator->>TTS: POST /api/v1/elevenlabs/tts
    TTS-->>Orchestrator: Audio ArrayBuffer
    Orchestrator->>AudioPlayback: play(audioData)
    AudioPlayback->>User: Play audio
    AudioPlayback-->>Orchestrator: Audio finished (callback)
    Orchestrator->>Orchestrator: Check: wasRecording && !manualStop
    alt Auto-restart
        Orchestrator->>Orchestrator: start()
        Orchestrator->>AudioCapture: start()
        Orchestrator->>UI: onStateChange('listening')
    else No restart
        Orchestrator->>UI: onStateChange('idle')
    end
```

## Data Flow Architecture

```mermaid
flowchart LR
    subgraph Input["📥 Input Layer"]
        Microphone["Microphone<br/>(MediaStream)"]
    end

    subgraph Processing["⚙️ Processing Layer"]
        Capture["Audio Capture<br/>(MediaRecorder)"]
        VAD_Proc["VAD<br/>(Real-time analysis)"]
        Conversion["WAV Conversion"]
    end

    subgraph AI["🤖 AI Services"]
        ElevenLabs_STT["ElevenLabs STT<br/>(Speech → Text)"]
        CrisisDetect["Crisis Detection<br/>(Gemini 2.5 Flash)"]
        Gemini["Gemini 2.5 Flash<br/>(Text → Response)"]
        ElevenLabs_TTS["ElevenLabs TTS<br/>(Text → Speech)"]
    end

    subgraph Output["📤 Output Layer"]
        AudioOut["Audio Playback<br/>(Web Audio API)"]
        UI_Display["UI Display<br/>(Conversation)"]
    end

    subgraph Storage["💾 Storage Layer"]
        LocalStorage_Data["localStorage<br/>(Conversation State)"]
        Cache["Response Cache<br/>(Deduplication)"]
    end

    Microphone --> Capture
    Capture --> VAD_Proc
    VAD_Proc --> Conversion
    Conversion --> ElevenLabs_STT
    ElevenLabs_STT --> CrisisDetect
    CrisisDetect --> Gemini
    Gemini --> ElevenLabs_TTS
    ElevenLabs_TTS --> AudioOut
    ElevenLabs_STT --> UI_Display
    Gemini --> UI_Display
    UI_Display --> LocalStorage_Data
    Gemini --> Cache
    Cache --> Gemini
```

## Rate Limiting & Queue Management

```mermaid
flowchart TB
    Request["New Request<br/>(getAIResponse())"]
    CacheCheck{"Response<br/>Cache Hit?"}
    Queue["Request Queue<br/>(Priority-based)"]
    RateLimit{"Rate Limit<br/>Available?"}
    TokenEstimate["Token Estimation<br/>(estimateConversationTokens)"]
    RecordRequest["Record Request<br/>(RPM/TPM/RPD)"]
    Execute["Execute Request<br/>(Gemini API)"]
    CacheResponse["Cache Response"]
    ReturnResponse["Return Response"]

    Request --> CacheCheck
    CacheCheck -->|"Hit"| ReturnResponse
    CacheCheck -->|"Miss"| Queue
    Queue --> TokenEstimate
    TokenEstimate --> RateLimit
    RateLimit -->|"Available"| RecordRequest
    RateLimit -->|"Limited"| Queue
    RecordRequest --> Execute
    Execute --> CacheResponse
    CacheResponse --> ReturnResponse

    style RateLimit fill:#ffebee
    style CacheCheck fill:#e8f5e9
    style Queue fill:#fff3e0
```
