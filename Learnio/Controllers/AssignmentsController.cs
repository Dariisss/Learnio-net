using Learnio.Data;
using Learnio.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Learnio.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AssignmentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;

        public AssignmentsController(ApplicationDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // GET: api/Assignments/course/{courseId}
        [HttpGet("course/{courseId}")]
        public async Task<IActionResult> GetAssignments(Guid courseId)
        {
            var assignments = await _context.Assignments
                .Where(a => a.CourseId == courseId)
                .OrderBy(a => a.Deadline)
                .ToListAsync();
            return Ok(assignments);
        }

        // POST: api/Assignments
        [HttpPost]
        public async Task<IActionResult> CreateAssignment([FromForm] CreateAssignmentDto model)
        {
            string? filePath = null;

            // 1. Сохранение файла
            if (model.File != null)
            {
                var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                var uniqueFileName = Guid.NewGuid().ToString() + "_" + model.File.FileName;
                var fullPath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var stream = new FileStream(fullPath, FileMode.Create))
                {
                    await model.File.CopyToAsync(stream);
                }

                filePath = "/uploads/" + uniqueFileName;
            }

            // 2. Создание задания
            var assignment = new Assignment
            {
                Id = Guid.NewGuid(),
                CourseId = model.CourseId,
                Title = model.Title,          // 👈 ТЕПЕРЬ ТУТ Title
                Description = model.Description,
                Deadline = model.Deadline,
                MaxScore = model.MaxScore,
                AttachmentUrl = filePath,
                CreatedAt = DateTime.UtcNow // 🔥 ЯВНО ЗАПИСЫВАЕМ ВРЕМЯ СОЗДАНИЯ
            };

            _context.Assignments.Add(assignment);
            await _context.SaveChangesAsync();

            return Ok(assignment);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAssignment(Guid id, [FromForm] CreateAssignmentDto model)
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null) return NotFound("Assignment not found");

            // Обновляем текст
            assignment.Title = model.Title;
            assignment.Description = model.Description;
            assignment.Deadline = model.Deadline;
            assignment.MaxScore = model.MaxScore;

            // Логика работы с файлами
            // 1. Если загрузили НОВЫЙ файл
            if (model.File != null)
            {
                // Удаляем старый с диска
                if (!string.IsNullOrEmpty(assignment.AttachmentUrl))
                {
                    var oldPath = Path.Combine(_env.WebRootPath, assignment.AttachmentUrl.TrimStart('/'));
                    if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath);
                }

                // Сохраняем новый
                var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                var uniqueFileName = Guid.NewGuid().ToString() + "_" + model.File.FileName;
                var fullPath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var stream = new FileStream(fullPath, FileMode.Create))
                {
                    await model.File.CopyToAsync(stream);
                }

                assignment.AttachmentUrl = "/uploads/" + uniqueFileName;
            }
            // 2. Если файл НЕ загрузили, но попросили УДАЛИТЬ старый (RemoveFile == true)
            else if (model.RemoveFile)
            {
                if (!string.IsNullOrEmpty(assignment.AttachmentUrl))
                {
                    var oldPath = Path.Combine(_env.WebRootPath, assignment.AttachmentUrl.TrimStart('/'));
                    if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath);
                }

                // Очищаем ссылку в базе
                assignment.AttachmentUrl = null;
            }

            await _context.SaveChangesAsync();
            return Ok(assignment);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAssignment(Guid id)
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null) return NotFound();

            // Удаляем файл с диска, чтобы не занимал место
            if (!string.IsNullOrEmpty(assignment.AttachmentUrl))
            {
                var filePath = Path.Combine(_env.WebRootPath, assignment.AttachmentUrl.TrimStart('/'));
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }
            }

            // Удаляем задание (SQL сам удалит Submissions благодаря Cascade Delete)
            _context.Assignments.Remove(assignment);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Assignment deleted" });
        }
    }

    }

    // DTO тоже меняем на Title
    public class CreateAssignmentDto
    {
        public Guid CourseId { get; set; }

        // 👇 БЫЛО Name, СТАЛО Title
        public string Title { get; set; }

        public string? Description { get; set; }
        public DateTime Deadline { get; set; }
        public int MaxScore { get; set; }
        public IFormFile? File { get; set; }

        // 🔥 НОВОЕ ПОЛЕ: Флаг для удаления файла
        public bool RemoveFile { get; set; }
}
