using Learnio.Data;
using Learnio.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Learnio.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SubmissionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;

        public SubmissionsController(ApplicationDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // ==========================================
        // 1. СТУДЕНТ СДАЕТ РАБОТУ (С ФАЙЛОМ)
        // ==========================================
        [HttpPost]
        public async Task<IActionResult> UploadSubmission([FromForm] UploadSubmissionDto model)
        {
            // 1. Проверяем, есть ли уже сдача
            var submission = await _context.Submissions
                .FirstOrDefaultAsync(s => s.AssignmentId == model.AssignmentId && s.StudentId == model.StudentId);

            // Если оценка уже стоит - нельзя пересдавать
            if (submission != null && submission.Grade != null)
            {
                return BadRequest("Graded work cannot be resubmitted.");
            }

            // 2. Сохраняем файл (если есть)
            string? filePath = null;
            if (model.File != null)
            {
                var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                var uniqueFileName = Guid.NewGuid().ToString() + "_" + model.File.FileName;
                using (var stream = new FileStream(Path.Combine(uploadsFolder, uniqueFileName), FileMode.Create))
                {
                    await model.File.CopyToAsync(stream);
                }
                filePath = "/uploads/" + uniqueFileName;
            }

            // 3. Создаем или Обновляем
            if (submission == null)
            {
                submission = new Submission
                {
                    Id = Guid.NewGuid(),
                    AssignmentId = model.AssignmentId,
                    StudentId = model.StudentId,
                    SubmissionDate = DateTime.UtcNow,
                    TextAnswer = model.TextAnswer,
                    FilePath = filePath
                };
                _context.Submissions.Add(submission);
            }
            else
            {
                // Обновляем существующую
                submission.SubmissionDate = DateTime.UtcNow;
                if (model.TextAnswer != null) submission.TextAnswer = model.TextAnswer;
                if (filePath != null) submission.FilePath = filePath;
            }

            await _context.SaveChangesAsync();
            return Ok(submission);
        }

        // ==========================================
        // 2. ПРОВЕРКА СТАТУСА (Для студента)
        // ==========================================
        [HttpGet("check")]
        public async Task<IActionResult> CheckSubmission(Guid assignmentId, string studentId)
        {
            var submission = await _context.Submissions
                .FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId);

            if (submission == null) return Ok(null);
            return Ok(submission);
        }

        // ==========================================
        // 3. СПИСОК СДАЧ (Для учителя)
        // ==========================================
        [HttpGet("assignment/{assignmentId}")]
        public async Task<IActionResult> GetSubmissionsForAssignment(Guid assignmentId)
        {
            var submissions = await _context.Submissions
                .Include(s => s.Student) // Подгружаем имя студента
                .Where(s => s.AssignmentId == assignmentId)
                .Select(s => new
                {
                    s.Id,
                    s.AssignmentId,
                    s.StudentId,
                    // Собираем полное имя
                    StudentName = s.Student.FirstName + " " + s.Student.LastName,
                    s.SubmissionDate,
                    s.FilePath,
                    s.TextAnswer,
                    s.Grade
                })
                .ToListAsync();

            return Ok(submissions);
        }
        // 4. ПОСТАВИТЬ ОЦЕНКУ (Только учитель)
        [HttpPut("{id}/grade")]
        public async Task<IActionResult> GradeSubmission(Guid id, [FromBody] GradeDto model)
        {
            var submission = await _context.Submissions.FindAsync(id);
            if (submission == null) return NotFound("Submission not found");

            submission.Grade = model.Grade;
            submission.TeacherComments = model.Comment;

            await _context.SaveChangesAsync();
            return Ok(submission);
        }


        // ==========================================
        // 5. GRADEBOOK (ЖУРНАЛ ОЦЕНОК)
        // ==========================================
        [HttpGet("gradebook/{courseId}")]
        public async Task<IActionResult> GetGradebook(Guid courseId)
        {
            // 1. Берем все задания курса (для заголовков таблицы)
            var assignments = await _context.Assignments
                .Where(a => a.CourseId == courseId)
                .OrderBy(a => a.Deadline) // Сортируем по дате
                .Select(a => new { a.Id, a.Title, a.MaxScore })
                .ToListAsync();

            // 2. Берем всех студентов курса (для строк таблицы)
            var students = await _context.Enrollments
                .Where(e => e.CourseId == courseId)
                .Include(e => e.Student)
                .Select(e => e.Student)
                .ToListAsync();

            // 3. Берем все оценки
            var submissions = await _context.Submissions
                .Include(s => s.Assignment)
                .Where(s => s.Assignment.CourseId == courseId)
                .ToListAsync();

            // 4. Собираем таблицу
            var gradebook = students.Select(student => new
            {
                StudentName = student.FirstName + " " + student.LastName,
                AvatarUrl = student.AvatarUrl,
                // Для каждого студента пробегаем по всем заданиям и ищем оценку
                Grades = assignments.Select(assign =>
                {
                    var sub = submissions.FirstOrDefault(s => s.StudentId == student.Id && s.AssignmentId == assign.Id);
                    return new
                    {
                        AssignmentId = assign.Id,
                        Score = sub?.Grade, // Оценка или null
                        IsSubmitted = sub != null // Сдавал ли вообще
                    };
                }).ToList()
            });

            return Ok(new { Assignments = assignments, Students = gradebook });
        }
    

    // ==========================================
        // 6. ОЦЕНКИ ДЛЯ СТУДЕНТА (Личный кабинет)
        // ==========================================
        [HttpGet("student-grades/{courseId}/{studentId}")]
        public async Task<IActionResult> GetStudentGrades(Guid courseId, string studentId)
        {
            // 1. Берем все задания курса
            var assignments = await _context.Assignments
                .Where(a => a.CourseId == courseId)
                .OrderBy(a => a.Deadline)
                .Select(a => new { a.Id, a.Title, a.MaxScore, a.Deadline })
                .ToListAsync();

            // 2. Берем сдачи этого студента
            var submissions = await _context.Submissions
                .Where(s => s.StudentId == studentId)
                .ToListAsync();

            // 3. Соединяем
            var result = assignments.Select(a =>
            {
                var sub = submissions.FirstOrDefault(s => s.AssignmentId == a.Id);
                return new
                {
                    AssignmentTitle = a.Title,
                    MaxScore = a.MaxScore,
                    Deadline = a.Deadline,
                    HasSubmitted = sub != null,
                    Grade = sub?.Grade,
                    SubmittedDate = sub?.SubmissionDate
                };
            });

            return Ok(result);
        }
    }
}

    // Добавь этот класс в самый низ файла (или в папку Dtos)
    public class GradeDto
    {
        public int Grade { get; set; }
        public string? Comment { get; set; }
    }


    // DTO для получения данных с формы
    public class UploadSubmissionDto
    {
        public Guid AssignmentId { get; set; }
        public string StudentId { get; set; }
        public string? TextAnswer { get; set; }
        public IFormFile? File { get; set; }
    }
