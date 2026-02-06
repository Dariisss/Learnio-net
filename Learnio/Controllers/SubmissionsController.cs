using Learnio.Data;
using Learnio.Dtos;
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

        public SubmissionsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 1. СДАТЬ РАБОТУ (Студент)
        [HttpPost]
        public async Task<IActionResult> SubmitWork([FromBody] CreateSubmissionDto model)
        {
            var assignment = await _context.Assignments.FindAsync(model.AssignmentId);
            if (assignment == null) return NotFound("Задание не найдено.");

            var student = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.StudentEmail);
            if (student == null) return BadRequest("Студент не найден.");

            var existing = await _context.Submissions
                .AnyAsync(s => s.AssignmentId == model.AssignmentId && s.StudentId == student.Id);

            if (existing) return BadRequest("Вы уже сдали эту работу!");

            var submission = new Submission
            {
                Id = Guid.NewGuid(),
                AssignmentId = model.AssignmentId,
                StudentId = student.Id,
                SubmissionDate = DateTime.UtcNow,
                TextAnswer = model.TextAnswer,
                FilePath = model.FileLink,

                // Оценки пока нет (ни от учителя, ни от AI)
                Grade = null,
                TeacherComments = null,
                AiRecommendedGrade = null,
                AiFeedback = null
            };

            _context.Submissions.Add(submission);
            await _context.SaveChangesAsync();

            // ТУТ В БУДУЩЕМ БУДЕТ ВЫЗОВ AI:
            // await _aiService.AnalyzeSubmission(submission.Id);

            return Ok(new { message = "Работа успешно отправлена!" });
        }

        // 2. ПОСМОТРЕТЬ РАБОТЫ (Учитель видит и работу, и подсказку AI)
        [HttpGet("assignment/{assignmentId}")]
        public async Task<IActionResult> GetSubmissionsForAssignment(Guid assignmentId)
        {
            var submissions = await _context.Submissions
                .Where(s => s.AssignmentId == assignmentId)
                .Include(s => s.Student)
                .Select(s => new
                {
                    s.Id,
                    StudentName = s.Student.FirstName + " " + s.Student.LastName,
                    SubmittedAt = s.SubmissionDate.ToString("yyyy-MM-dd HH:mm"),
                    s.TextAnswer,
                    s.FilePath,

                    // Учитель видит, что он поставил
                    CurrentGrade = s.Grade,
                    s.TeacherComments,

                    // И видит подсказку от AI (но студент этого не видит!)
                    AiRecommendation = s.AiRecommendedGrade,
                    AiComments = s.AiFeedback
                })
                .ToListAsync();

            return Ok(submissions);
        } // <--- ВОТ ТУТ БЫЛА ОШИБКА (Пропущена скобка)

        // 3. ПОСТАВИТЬ ОЦЕНКУ (Только учитель!)
        [HttpPut("{id}/grade")]
        public async Task<IActionResult> GradeSubmission(Guid id, [FromBody] GradeSubmissionDto model)
        {
            var submission = await _context.Submissions.FindAsync(id);
            if (submission == null) return NotFound("Работа не найдена.");

            // Учитель принимает решение (может послушать AI, может нет)
            submission.Grade = model.Grade;
            submission.TeacherComments = model.Comment;

            await _context.SaveChangesAsync();

            return Ok(new { message = $"Оценка {model.Grade} сохранена!", submission });
        }
    }
}