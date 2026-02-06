using Learnio.Data;
using Learnio.Dtos;
using Learnio.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Learnio.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CoursesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CoursesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 1. СОЗДАТЬ КУРС (POST: api/courses)
        [HttpPost]
        public async Task<IActionResult> CreateCourse([FromBody] CreateCourseDto model)
        {
            // Пока временно привяжем к ПЕРВОМУ попавшемуся юзеру (потом исправим на текущего)
            var teacher = await _context.Users.FirstOrDefaultAsync();
            if (teacher == null) return BadRequest("Нет ни одного юзера в базе!");

            var course = new Course
            {
                Id = Guid.NewGuid(),
                Name = model.Name,
                Description = model.Description,
                JoinCode = Guid.NewGuid().ToString().Substring(0, 6).ToUpper(), // Генерируем код (XY12A)
                TeacherId = teacher.Id,
                CreatedAt = DateTime.UtcNow
            };

            _context.Courses.Add(course);
            await _context.SaveChangesAsync();

            return Ok(course);
        }

        // 2. ПОЛУЧИТЬ ВСЕ КУРСЫ (GET: api/courses)
        [HttpGet]
        public async Task<IActionResult> GetAllCourses()
        {
            var courses = await _context.Courses
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    TeacherName = c.Teacher.FirstName + " " + c.Teacher.LastName
                })
                .ToListAsync();

            return Ok(courses);
        }
    }
}